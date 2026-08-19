# XML language server on CachyOS

Eclipse LemMinX provides XML language support for DMN, BPMN, SHACL-XML, and XSD.

`../../../upgrade-servers` resolves the Eclipse Maven `<release>` value and stages the JAR. It requires a successful LSP handshake before activation. If validation fails, it restores the previous JAR. `host/cachyos/upgrade` runs the shared upgrader.

## Prerequisites

1. Install a Java runtime. Use `jdk-openjdk`, or run `sudo pacman -S --needed jre-openjdk-headless` for the headless package.
2. Configure `~/.local/bin/lemminx` to run `java -jar ~/.local/share/lemminx/lemminx.jar "$@"`.

The Maven `maven-metadata.xml` `<release>` value is authoritative. GitHub releases lag this artifact.
