#include <QDBusConnection>
#include <QDBusConnectionInterface>
#include <QDBusMessage>
#include <QElapsedTimer>
#include <QGuiApplication>
#include <QPixmap>
#include <QProcess>
#include <QProcessEnvironment>
#include <QScreen>
#include <QThread>
#include <X11/Xatom.h>
#include <X11/Xlib.h>
#include <X11/keysym.h>
#include <cstdio>
#include <functional>

static bool waitFor(const std::function<bool()> &condition, int timeout = 6000)
{
    QElapsedTimer timer;
    timer.start();
    do {
        QCoreApplication::processEvents();
        if (condition()) return true;
        QThread::msleep(25);
    } while (timer.elapsed() < timeout);
    return false;
}

static QList<unsigned long> property(Display *display, Window window, const char *name, Atom type)
{
    Atom actualType;
    int format;
    unsigned long count, remaining;
    unsigned char *data = nullptr;
    QList<unsigned long> values;
    if (XGetWindowProperty(display, window, XInternAtom(display, name, False), 0, 4096,
                           False, type, &actualType, &format, &count, &remaining, &data) == Success
        && actualType == type && format == 32) {
        auto items = reinterpret_cast<unsigned long *>(data);
        for (unsigned long i = 0; i < count; ++i) values.append(items[i]);
    }
    if (data) XFree(data);
    return values;
}

int main(int argc, char **argv)
{
    if (argc != 3) return 2;
    // Probe capture uses the framebuffer; the child must exercise its own launch policy.
    qputenv("QT_QPA_PLATFORM", "xcb");
    qputenv("QT_XCB_NO_XRANDR", "1");
    QGuiApplication app(argc, argv);
    const auto bus = QDBusConnection::sessionBus();
    if (!bus.isConnected() || bus.interface()->isServiceRegistered("org.kde.LogoutPrompt").value()) return 2;
    Display *display = XOpenDisplay(nullptr);
    if (!display) return 2;
    const Window root = DefaultRootWindow(display);
    QProcess greeter;
    auto environment = QProcessEnvironment::systemEnvironment();
    environment.remove("QT_XCB_NO_XRANDR");
    // Private session bus + disconnected system bus + upstream fake power backend.
    environment.insert("DBUS_SYSTEM_BUS_ADDRESS", "unix:path=/nonexistent/sonic-restart-system-bus");
    environment.insert("PLASMA_SESSION_GUI_TEST", "1");
    environment.insert("QT_ACCESSIBILITY", "0");
    greeter.setProcessEnvironment(environment);
    greeter.setProcessChannelMode(QProcess::MergedChannels);
    greeter.start(QString::fromLocal8Bit(argv[1]), QStringList{});
    auto finish = [&](bool success, const char *message) {
        if (greeter.state() != QProcess::NotRunning) {
            greeter.terminate();
            if (!greeter.waitForFinished(2000)) {
                greeter.kill();
                greeter.waitForFinished();
            }
        }
        std::printf("%s %s\n", success ? "PASS" : "FAIL", message);
        const auto output = greeter.readAll();
        if (!success) std::fwrite(output.data(), 1, output.size(), stderr);
        XCloseDisplay(display);
        return success ? 0 : 1;
    };
    if (!greeter.waitForStarted() || !waitFor([&] {
            return bus.interface()->isServiceRegistered("org.kde.LogoutPrompt").value();
        })) return finish(false, "greeter D-Bus registration");
    const auto pid = greeter.processId();
    const auto reply = bus.call(QDBusMessage::createMethodCall("org.kde.LogoutPrompt", "/LogoutPrompt",
                                                              "org.kde.LogoutPrompt", "promptReboot"));
    if (reply.type() == QDBusMessage::ErrorMessage) return finish(false, "restart prompt call");
    Window window = None;
    XWindowAttributes attributes{};
    if (!waitFor([&] {
            for (auto candidate : property(display, root, "_NET_CLIENT_LIST", XA_WINDOW)) {
                if (property(display, candidate, "_NET_WM_PID", XA_CARDINAL).value(0) != static_cast<unsigned long>(pid)) continue;
                if (XGetWindowAttributes(display, candidate, &attributes) && attributes.map_state == IsViewable
                    && attributes.width > 0 && attributes.height > 0
                    && property(display, root, "_NET_ACTIVE_WINDOW", XA_WINDOW).value(0) == candidate) {
                    window = candidate;
                    return true;
                }
            }
            return false;
        })) return finish(false, "restart prompt visible + focused");
    std::printf("PASS restart prompt visible + focused: %dx%d\n", attributes.width, attributes.height);
    if (*argv[2] && !app.primaryScreen()->grabWindow(window).save(QString::fromLocal8Bit(argv[2]))) {
        return finish(false, "prompt capture");
    }
    // Address only the test process's window; never inject a key into the user's focus.
    XEvent event{};
    event.xkey = {KeyPress, 0, True, display, window, root, None, CurrentTime, 1, 1, 1, 1,
                  0, XKeysymToKeycode(display, XK_Return), True};
    XSendEvent(display, window, False, KeyPressMask, &event);
    event.type = KeyRelease;
    XSendEvent(display, window, False, KeyReleaseMask, &event);
    XFlush(display);
    if (!waitFor([&] { return greeter.state() == QProcess::NotRunning; })) {
        return finish(false, "restart confirmation exits greeter");
    }
    const auto output = greeter.readAll();
    if (!output.split('\n').contains("reboot") || greeter.exitCode() != 0) {
        std::fwrite(output.data(), 1, output.size(), stderr);
        return finish(false, "upstream test backend receives reboot");
    }
    return finish(true, "restart confirmation → test backend reboot; no host power action");
}
