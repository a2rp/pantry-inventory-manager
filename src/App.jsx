import { useEffect, useState } from "react";
import styles from "./App.module.css";
import SiteHeader from "./components/siteHeader";
import SiteFooter from "./components/siteFooter";
import BackToTop from "./components/backToTop";
import PantryInventoryManager from "./components/pantryInventoryManager";

const App = () => {
    const [showBackToTop, setShowBackToTop] = useState(false);

    useEffect(() => {
        const onScroll = () => setShowBackToTop(window.scrollY > 50);
        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <div className={styles["app-shell"]} id="top">
            <SiteHeader
                title="Pantry Notes"
                mark="P"
                navItems={[["Inventory", "#workspace"], ["Add an item", "#add"]]}
                repoUrl="https://github.com/a2rp/pantry-inventory-manager"
            />
            <main className={styles.pageContent}>
                <PantryInventoryManager />
            </main>
            <SiteFooter repoUrl="https://github.com/a2rp/pantry-inventory-manager" />
            <BackToTop visible={showBackToTop} />
        </div>
    );
};

export default App;