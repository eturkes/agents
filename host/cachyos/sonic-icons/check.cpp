#include <QApplication>
#include <QDir>
#include <QFileInfo>
#include <QIcon>
#include <QPixmap>
#include <QSet>
#include <QSettings>
#include <QTextStream>

int main(int argc, char **argv)
{
    QApplication app(argc, argv);
    QTextStream out(stdout);
    const auto theme = QIcon::themeName();
    const QDir base("/usr/share/icons/" + theme);
    QSettings manifest(base.filePath("index.theme"), QSettings::IniFormat);
    manifest.beginGroup("Icon Theme");
    const auto directories = manifest.value("Directories").toStringList()
        + manifest.value("ScaledDirectories").toStringList();
    if (theme.isEmpty() || directories.isEmpty()) {
        out << "FAIL: no installed manifest for active theme=" << theme << '\n';
        return 2;
    }
    QSet<QString> names;
    for (const auto &directory : directories) {
        const QDir path(base.filePath(directory));
        for (const auto &file : path.entryInfoList({"*.svg", "*.svgz", "*.png", "*.xpm"}, QDir::Files))
            names.insert(file.completeBaseName());
    }
    if (names.isEmpty()) {
        out << "FAIL: empty installed icon inventory\n";
        return 2;
    }
    auto sorted = names.values();
    sorted.sort();
    int failures = 0;
    for (const auto &name : sorted) {
        const auto icon = QIcon::fromTheme(name);
        bool ok = QIcon::hasThemeIcon(name) && !icon.isNull();
        for (const int size : {16, 32, 64})
            ok = ok && !icon.pixmap(size, size).isNull();
        if (!ok && ++failures <= 12)
            out << "missing=" << name << '\n';
    }
    const auto unknown = QStringLiteral("sonic-icon-check-nonexistent-587c5b18");
    if (!QIcon::fromTheme(unknown).isNull()) {
        out << "FAIL: absent-icon negative control returned an icon\n";
        ++failures;
    }
    out << "theme=" << theme << " inventory=" << names.size()
        << " render_sizes=16,32,64 missing=" << failures << '\n';
    return failures != 0;
}
