# xml-lsp

Generic XML LSP via Eclipse LemMinX. Covers DMN, BPMN, SHACL-XML, XSD.

Install / upgrade:
1. A JRE is already present (`jdk-openjdk`); a headless-only box can use
   `sudo pacman -S --needed jre-openjdk-headless` instead.
2. Download the uber jar (LemMinX is not packaged in the repos or the AUR, so
   this one stays a manual pinned install):
   `curl -sSL --create-dirs -o ~/.local/share/lemminx/lemminx.jar https://repo.eclipse.org/content/repositories/lemminx-releases/org/eclipse/lemminx/org.eclipse.lemminx/0.31.1/org.eclipse.lemminx-0.31.1-uber.jar`
3. Drop a `lemminx` wrapper into `~/.local/bin/` that runs
   `java -jar ~/.local/share/lemminx/lemminx.jar "$@"`.

Not yet installed on this machine — recipe only.
