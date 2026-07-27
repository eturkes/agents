# xml-lsp

Eclipse LemMinX XML LSP: DMN, BPMN, SHACL-XML, XSD.

Tracks latest. `../../../upgrade-servers` resolves the current release from the
Eclipse Maven repo, swaps the jar, verifies an LSP handshake, and rolls back on
failure. It runs from `host/cachyos/upgrade`, so there is nothing to do by hand
and no version recorded here.

Prerequisites:
1. JRE present: `jdk-openjdk`; headless option:
   `sudo pacman -S --needed jre-openjdk-headless`.
2. `~/.local/bin/lemminx`: `java -jar ~/.local/share/lemminx/lemminx.jar "$@"`.

Version truth is the Maven repo's `maven-metadata.xml` `<release>`, NOT GitHub
releases: that project's `releases/latest` reports 0.11.0, an ancient entry that
would hold upgrades back indefinitely.

Status: installed + verified here.
