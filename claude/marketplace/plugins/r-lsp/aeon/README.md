# R language server on Aeon

The `languageserver` R package provides diagnostics through `lintr`, definitions, and hover for `.R` files. The plugin starts it through `Rscript`.

## Prerequisites

1. Install R with `sudo apt install r-base`.
2. Run `Rscript -e 'install.packages("languageserver")'`.
3. Confirm that `Rscript -e 'library(languageserver)'` exits with status 0.

The plugin starts R with `--no-init-file`, so R skips the user and project `.Rprofile` files. It loads `languageserver` from the user or system library. Then it puts the project library first, if one exists for the running R version. It finds the `rv` library and the `renv` library, including prefix-free layouts and the active `renv` profile. Completion and diagnostics thus see the project packages.
