# souffle-lsp

Souffle Datalog LSP via jdaridis/souffle-lsp-plugin.

Install / upgrade:
1. `sudo apt-get install -y openjdk-21-jre-headless`
2. Install Souffle (Debian 13 needs libffi7 from the Debian snapshot, since the
   official package targets Ubuntu 20.04 with libffi7):
   ```
   sudo wget -q https://souffle-lang.github.io/ppa/souffle-key.public \
     -O /usr/share/keyrings/souffle-archive-keyring.gpg
   echo "deb [signed-by=/usr/share/keyrings/souffle-archive-keyring.gpg] \
     https://souffle-lang.github.io/ppa/ubuntu/ stable main" \
     | sudo tee /etc/apt/sources.list.d/souffle.list
   sudo apt-get update
   curl -sL -o /tmp/libffi7.deb \
     http://snapshot.debian.org/archive/debian/20210602T144247Z/pool/main/libf/libffi/libffi7_3.3-6_amd64.deb
   sudo dpkg -i /tmp/libffi7.deb
   sudo apt-get install -y souffle
   ```
3. Build the LSP jar (the `jar` task emits the artifact even though gradle prints
   `BUILD FAILED` on a post-package daemon-teardown step):
   ```
   git clone https://github.com/jdaridis/souffle-lsp-plugin.git
   cd souffle-lsp-plugin
   ./gradlew jar --no-daemon --console=plain
   install -D -m 644 build/libs/Souffle_Ide_Plugin-1.0-SNAPSHOT.jar \
     ~/.local/share/souffle-lsp/souffle-lsp.jar
   ```
4. Drop a `souffle-lsp` wrapper into `~/.local/bin/` that runs
   `java -jar ~/.local/share/souffle-lsp/souffle-lsp.jar "$@"`.

Notes:
- The server requires the client to advertise `textDocument.codeAction` (Claude
  Code does; without it `initialize` NPEs).
- It uses an in-process ANTLR parser and shells out to `souffle-lint` for
  diagnostics (separately installable; basic LSP features work without it).

Last verified: souffle 2.4 + Souffle LSP 1.0-SNAPSHOT on Debian 13 trixie.
