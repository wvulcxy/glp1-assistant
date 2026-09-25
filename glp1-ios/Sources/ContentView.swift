import SwiftUI

struct ContentView: View {
    var body: some View {
        WebViewWrapper()
            .ignoresSafeArea(.container)
            .preferredColorScheme(.light)
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}
