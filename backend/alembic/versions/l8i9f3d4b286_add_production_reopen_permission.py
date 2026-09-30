"""add production reopen permission

Revision ID: l8i9f3d4b286
Revises: k7h8e2c3a175
Create Date: 2026-09-30

"""

from typing import (
    Sequence,
    Union,
)

from alembic import op
import sqlalchemy as sa


revision: str = (
    "l8i9f3d4b286"
)

down_revision: Union[
    str,
    Sequence[str],
    None,
] = (
    "k7h8e2c3a175"
)

branch_labels = None

depends_on = None


def upgrade() -> None:

    connection = (
        op.get_bind()
    )


    permissions_table = (
        sa.table(
            "permissions",

            sa.column(
                "id",
                sa.Integer(),
            ),

            sa.column(
                "name",
                sa.String(),
            ),

            sa.column(
                "module",
                sa.String(),
            ),

            sa.column(
                "description",
                sa.String(),
            ),
        )
    )


    existing_id = (
        connection.execute(
            sa.select(
                permissions_table.c.id
            )
            .where(
                permissions_table.c.name
                ==
                "production.reopen"
            )
        )
        .scalar_one_or_none()
    )


    if (
        existing_id
        is None
    ):

        connection.execute(
            permissions_table
            .insert()
            .values(
                name=(
                    "production.reopen"
                ),

                module=(
                    "Production"
                ),

                description=(
                    "Boss-only recovery action "
                    "to reopen Completed Production "
                    "before Final Billing."
                ),
            )
        )


def downgrade() -> None:

    connection = (
        op.get_bind()
    )


    permissions_table = (
        sa.table(
            "permissions",

            sa.column(
                "id",
                sa.Integer(),
            ),

            sa.column(
                "name",
                sa.String(),
            ),
        )
    )


    role_permissions_table = (
        sa.table(
            "role_permissions",

            sa.column(
                "permission_id",
                sa.Integer(),
            ),
        )
    )


    permission_id = (
        connection.execute(
            sa.select(
                permissions_table.c.id
            )
            .where(
                permissions_table.c.name
                ==
                "production.reopen"
            )
        )
        .scalar_one_or_none()
    )


    if (
        permission_id
        is not None
    ):

        connection.execute(
            role_permissions_table
            .delete()
            .where(
                role_permissions_table
                .c
                .permission_id
                ==
                permission_id
            )
        )


        connection.execute(
            permissions_table
            .delete()
            .where(
                permissions_table
                .c
                .id
                ==
                permission_id
            )
        )