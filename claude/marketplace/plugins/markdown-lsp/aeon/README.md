# Markdown language server on Aeon

Marksman reports broken links, duplicate headings, and unresolved references in Markdown, Quarto, and R Markdown files.

## Prerequisites

1. Download the `marksman-linux-x64` asset from the latest release at <https://github.com/artempyanykh/marksman/releases>.
2. Install it as `~/.local/bin/marksman` with mode 755.
3. Confirm that `marksman --version` prints a version.

`~/agents/container/aeon/upgrade` does not manage this binary. Repeat the steps for a new release.
