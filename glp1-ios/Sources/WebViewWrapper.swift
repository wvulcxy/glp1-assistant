import SwiftUI
import WebKit

struct WebViewWrapper: UIViewRepresentable {
    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()

        // CRITICAL: use .default() so localStorage persists across app restarts
        config.websiteDataStore = .default()

        // Enable JS ↔ Swift bridge for notifications
        let userContentController = WKUserContentController()
        userContentController.add(context.coordinator, name: "notification")
        config.userContentController = userContentController

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.backgroundColor = UIColor(red: 0.96, green: 0.97, blue: 0.98, alpha: 1) // #F5F7FA
        webView.scrollView.backgroundColor = UIColor(red: 0.96, green: 0.97, blue: 0.98, alpha: 1)
        webView.isOpaque = false
        webView.navigationDelegate = context.coordinator
        webView.scrollView.contentInsetAdjustmentBehavior = .automatic
        webView.scrollView.bounces = true

        // Load local index.html from Assets folder
        if let url = Bundle.main.url(forResource: "index",
                                     withExtension: "html",
                                     subdirectory: "Assets") {
            webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        }

        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    // MARK: - Coordinator: handles JS bridge messages
    class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        func userContentController(
            _ userContentController: WKUserContentController,
            didReceive message: WKScriptMessage
        ) {
            guard message.name == "notification",
                  let body = message.body as? String,
                  let data = try? JSONDecoder().decode(NotificationMessage.self,
                                                       from: body.data(using: .utf8)!)
            else { return }

            switch data.action {
            case "requestPermission":
                NotificationManager.shared.requestPermission { granted in
                    // JS will re-check via the notificationStatus bridge
                }

            case "schedule":
                NotificationManager.shared.schedule(
                    title: data.title ?? "GLP-1 用药提醒",
                    body: data.body ?? "该注射了！",
                    delaySeconds: data.delaySeconds ?? 0
                )

            default:
                break
            }
        }
    }
}

/// Messages sent from JS via webkit.messageHandlers.notification.postMessage()
struct NotificationMessage: Codable {
    let action: String
    let title: String?
    let body: String?
    let delaySeconds: TimeInterval?
}
