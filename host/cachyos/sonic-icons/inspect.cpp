#include <QApplication>
#include <QDir>
#include <QIcon>
#include <QPixmap>
#include <QSet>
#include <QSettings>
#include <QTextStream>

int main(int argc, char **argv)
{
    QApplication app(argc, argv);
    QTextStream out(stdout);
    auto names = app.arguments().mid(1);
    if (names.isEmpty()) {
        const QDir root("/usr/share/icons/" + QIcon::themeName());
        QSettings manifest(root.filePath("index.theme"), QSettings::IniFormat);
        manifest.beginGroup("Icon Theme");
        const auto directories = manifest.value("Directories").toStringList()
            + manifest.value("ScaledDirectories").toStringList();
        QSet<QString> inventory;
        for (const auto &directory : directories)
            for (const auto &file : QDir(root.filePath(directory)).entryInfoList({"*.svg", "*.svgz", "*.png", "*.xpm"}, QDir::Files))
                inventory.insert(file.completeBaseName());
        names = inventory.values();
        names.sort();
    }
    if (names.isEmpty()) {
        out << "error=empty_inventory\n";
        return 2;
    }
    int fallbacks = 0, blank = 0;
    for (const auto &name : names) {
        const auto icon = QIcon::fromTheme(name);
        const bool exact = QIcon::hasThemeIcon(name);
        const bool blank16 = icon.pixmap(16, 16).isNull();
        const bool blank32 = icon.pixmap(32, 32).isNull();
        const bool blank64 = icon.pixmap(64, 64).isNull();
        fallbacks += !exact;
        blank += blank16 || blank32 || blank64;
        if (!exact || blank16 || blank32 || blank64)
            out << "name=" << name << " resolved=" << icon.name() << " exact=" << exact
                << " blank16=" << blank16 << " blank32=" << blank32 << " blank64=" << blank64 << '\n';
    }
    out << "theme=" << QIcon::themeName() << " inventory=" << names.size()
        << " fallbacks=" << fallbacks << " blank=" << blank << '\n';
}
