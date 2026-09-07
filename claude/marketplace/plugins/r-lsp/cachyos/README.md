# R language server on CachyOS

The `languageserver` R package provides diagnostics through `lintr`, definitions, and hover for `.R` files. The plugin starts it with `Rscript -e 'languageserver::run()'`.

## Prerequisites

1. Install R with `sudo pacman -S --needed r`.
2. Run `paru -S --needed r-languageserver`, or run `Rscript -e 'install.packages("languageserver")'`.
3. Confirm that `Rscript -e 'library(languageserver)'` exits with status 0.

Project-level `rv` or `renv` libraries stay separate. The plugin uses the user or system library.
