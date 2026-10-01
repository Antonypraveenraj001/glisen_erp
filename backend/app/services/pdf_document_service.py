import asyncio

from playwright.sync_api import (
    Error as PlaywrightError,
    Route,
    sync_playwright,
)


class PdfDocumentService:

    # ============================================================
    # BLOCK EXTERNAL NETWORK
    # ============================================================

    @staticmethod
    def _handle_route(
        route: Route,
    ) -> None:

        url = (
            route.request.url
            or
            ""
        ).lower()

        if (
            url.startswith(
                "http://"
            )
            or
            url.startswith(
                "https://"
            )
        ):

            route.abort()

            return

        route.continue_()

    # ============================================================
    # SYNCHRONOUS PDF RENDERER
    #
    # IMPORTANT:
    #
    # Playwright's asynchronous subprocess handling can conflict
    # with Uvicorn --reload on Windows.
    #
    # Therefore Chromium is launched through Playwright's sync API
    # inside a worker thread.
    #
    # This avoids the Windows asyncio subprocess issue while keeping
    # the FastAPI endpoint asynchronous.
    # ============================================================

    @staticmethod
    def _render_sync(
        html: str,
    ) -> bytes:

        browser = None

        try:

            with sync_playwright() as playwright:

                browser = (
                    playwright
                    .chromium
                    .launch(
                        headless=True,
                    )
                )

                page = (
                    browser
                    .new_page()
                )

                # ------------------------------------------------
                # The ERP document is self-contained.
                #
                # Logo is already embedded as a data URL.
                # No outside network access is required.
                # ------------------------------------------------

                page.route(
                    "**/*",
                    PdfDocumentService
                    ._handle_route,
                )

                # ------------------------------------------------
                # Match browser Print rendering.
                # ------------------------------------------------

                page.emulate_media(
                    media="print"
                )

                page.set_content(
                    html,
                    wait_until="load",
                )

                # ------------------------------------------------
                # Wait for fonts / layout.
                # ------------------------------------------------

                page.evaluate(
                    """
                    async () => {
                        if (
                            document.fonts
                            &&
                            document.fonts.ready
                        ) {
                            await document.fonts.ready;
                        }
                    }
                    """
                )

                # ------------------------------------------------
                # Real PDF output.
                #
                # Existing @page CSS remains authoritative.
                # ------------------------------------------------

                pdf_bytes = (
                    page.pdf(
                        format="A4",

                        print_background=True,

                        prefer_css_page_size=True,

                        display_header_footer=False,
                    )
                )

                browser.close()

                browser = None

                return pdf_bytes

        except PlaywrightError as exc:

            message = str(
                exc
            )

            if (
                "Executable doesn't exist"
                in message
                or
                "browserType.launch"
                in message
            ):

                raise RuntimeError(
                    "PDF Chromium renderer is not installed. "
                    "Run: "
                    "python -m playwright install chromium"
                ) from exc

            raise RuntimeError(
                "Unable to generate PDF document. "
                f"Playwright error: {message}"
            ) from exc

        except Exception as exc:

            raise RuntimeError(
                "Unable to generate PDF document. "
                f"{type(exc).__name__}: {exc}"
            ) from exc

        finally:

            if (
                browser
                is not None
            ):

                try:

                    browser.close()

                except Exception:

                    pass

    # ============================================================
    # ASYNC ENTRY POINT USED BY FASTAPI
    #
    # The actual Chromium process runs in a worker thread instead
    # of Uvicorn's Windows asyncio event loop.
    # ============================================================

    @staticmethod
    async def render_html(
        html: str,
    ) -> bytes:

        if (
            not html
            or
            not html.strip()
        ):

            raise ValueError(
                "Document HTML is empty."
            )

        return await asyncio.to_thread(
            PdfDocumentService._render_sync,
            html,
        )