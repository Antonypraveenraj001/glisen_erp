"""Collision-resistant backup names and non-overwriting archive publication.

Publication prefers a non-overwriting hard link for atomic visibility and
uses an exclusive-create copy on filesystems without hard-link support.
The partial and final path must be in the same directory/filesystem.
"""

from __future__ import annotations

import errno
import os
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path


def build_archive_filename(prefix: str, backup_type: str) -> str:
    """Return a unique name while retaining the required ``_MANUAL.zip`` suffix."""
    kind = str(backup_type or "").upper()
    if kind not in {"MANUAL", "AUTOMATIC", "FY_FINAL"}:
        raise ValueError("Unsupported backup type for archive filename.")

    stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    return f"{prefix}{stamp}_{uuid.uuid4().hex}_{kind}.zip"


def publish_archive_no_overwrite(partial_path: Path, final_path: Path) -> None:
    """Publish a complete archive without overwriting an older one.

    The completed ``.partial`` file must reside in the same directory as its
    final name. Hard-link publication is atomic on NTFS and ext4. Other
    filesystems use an exclusive-create copy, which never overwrites existing
    files but is not atomic; the normal backup validation runs after publish.
    """
    partial = Path(partial_path)
    final = Path(final_path)

    if partial == final or partial.parent.resolve() != final.parent.resolve():
        raise ValueError("Archive partial and final must be different names in the same folder.")

    # First try an atomic, no-clobber hard link on filesystems supporting it.
    try:
        os.link(partial, final)
    except FileExistsError:
        raise
    except OSError as exc:
        if exc.errno not in (
            errno.EPERM,
            errno.EOPNOTSUPP,
            errno.ENOTSUP,
            errno.EXDEV,
        ):
            raise

        # Some Windows drives and network shares do not support hard links.
        # "xb" is exclusive and refuses to open an existing final path.
        with partial.open("rb") as source:
            with final.open("xb") as destination:
                try:
                    shutil.copyfileobj(source, destination, length=1024 * 1024)
                    destination.flush()
                    os.fsync(destination.fileno())
                except BaseException:
                    try:
                        destination.close()
                    finally:
                        final.unlink(missing_ok=True)
                    raise

    # After publication, the completed final is durable. Leaving a .partial
    # behind after a rare unlink failure is safer than losing the final.
    try:
        partial.unlink()
    except OSError:
        pass
