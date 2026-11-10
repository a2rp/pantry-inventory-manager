import { useMemo, useState } from "react";
import { FiAlertCircle, FiMinus, FiPlus, FiSearch, FiTrash2 } from "react-icons/fi";
import ConfirmDialog from "../confirmDialog";
import styles from "./styles.module.css";

const storageKey = "pantry-notes-inventory";
const dateAfter = (days) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + days);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const isValidDate = (value) => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day, 12);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
};
const starterStock = [
    { id: 1, name: "Rolled oats", category: "Breakfast", quantity: 2, unit: "bags", minimum: 1, expiry: dateAfter(120) },
    { id: 2, name: "Chickpeas", category: "Tins & jars", quantity: 1, unit: "cans", minimum: 3, expiry: dateAfter(340) },
    { id: 3, name: "Olive oil", category: "Cooking", quantity: 1, unit: "bottle", minimum: 1, expiry: dateAfter(18) },
    { id: 4, name: "Brown rice", category: "Grains", quantity: 3, unit: "bags", minimum: 1, expiry: dateAfter(230) },
    { id: 5, name: "Coconut milk", category: "Tins & jars", quantity: 2, unit: "cans", minimum: 2, expiry: dateAfter(5) },
];
const readStock = () => {
    try {
        const saved = localStorage.getItem(storageKey);
        if (!saved) return starterStock.map((item) => ({ ...item }));
        const parsed = JSON.parse(saved);
        if (!Array.isArray(parsed)) return starterStock.map((item) => ({ ...item }));

        const ids = new Set();
        return parsed.flatMap((item, index) => {
            if (!item || typeof item !== "object" || Array.isArray(item)) return [];
            const name = typeof item.name === "string" ? item.name.trim().slice(0, 80) : "";
            if (!name) return [];

            const originalId = typeof item.id === "string" && item.id.trim() && item.id.length <= 120
                ? item.id
                : Number.isSafeInteger(item.id) ? item.id : `saved-${index}`;
            let id = String(originalId);
            while (ids.has(id)) id = `${String(originalId)}-${index}-${ids.size}`;
            ids.add(id);

            return [{
                id,
                name,
                category: typeof item.category === "string" && item.category.trim() ? item.category.trim().slice(0, 50) : "Other",
                quantity: Number.isFinite(item.quantity) ? Math.max(0, item.quantity) : 0,
                unit: typeof item.unit === "string" && item.unit.trim() ? item.unit.trim().slice(0, 20) : "items",
                minimum: Number.isFinite(item.minimum) ? Math.max(0, item.minimum) : 1,
                expiry: isValidDate(item.expiry) ? item.expiry : dateAfter(180),
            }];
        });
    } catch {
        return starterStock.map((item) => ({ ...item }));
    }
};
const shortDate = (date) => new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(date + "T12:00:00"));

const PantryInventoryManager = () => {
    const [stock, setStock] = useState(readStock);
    const [filter, setFilter] = useState("Everything");
    const [category, setCategory] = useState("All shelves");
    const [query, setQuery] = useState("");
    const [draft, setDraft] = useState({ name: "", category: "Tins & jars", quantity: "1", unit: "items", minimum: "1", expiry: dateAfter(180) });
    const [pendingDelete, setPendingDelete] = useState(null);
    const [storageUnavailable, setStorageUnavailable] = useState(() => {
        try {
            localStorage.getItem(storageKey);
            return false;
        } catch {
            return true;
        }
    });
    const saveStock = (nextStock) => {
        setStock(nextStock);
        try {
            localStorage.setItem(storageKey, JSON.stringify(nextStock));
            setStorageUnavailable(false);
        } catch {
            setStorageUnavailable(true);
        }
    };

    const categories = ["All shelves", ...new Set(stock.map((item) => item.category))];
    const lowStock = stock.filter((item) => item.quantity <= item.minimum).length;
    const expiring = stock.filter((item) => item.expiry <= dateAfter(7)).length;
    const visibleStock = useMemo(() => stock.filter((item) => {
        const matchesFilter = filter === "Everything" || (filter === "Low stock" ? item.quantity <= item.minimum : item.expiry <= dateAfter(7));
        const matchesSearch = (item.name + " " + item.category).toLowerCase().includes(query.toLowerCase());
        return matchesFilter && matchesSearch && (category === "All shelves" || item.category === category);
    }).sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)), [stock, filter, query, category]);

    const addItem = (event) => {
        event.preventDefault();
        if (!draft.name.trim()) return;
        saveStock([...stock, { ...draft, id: Date.now(), name: draft.name.trim(), quantity: Number(draft.quantity), minimum: Number(draft.minimum) }]);
        setDraft({ name: "", category: "Tins & jars", quantity: "1", unit: "items", minimum: "1", expiry: dateAfter(180) });
    };
    const changeQuantity = (id, amount) => saveStock(stock.map((item) => item.id === id ? { ...item, quantity: Math.max(0, item.quantity + amount) } : item));
    const removeItem = () => {
        saveStock(stock.filter((item) => item.id !== pendingDelete.id));
        setPendingDelete(null);
    };

    return (
        <section className={styles.pantryInventoryManager} id="workspace">
            <div className={styles.topBand}>
                <div><p className={styles.label}>THE PANTRY SHELF</p><h1>Know what is<br /><span>in the cupboard.</span></h1><p className={styles.description}>A little inventory helps dinner come together.</p></div>
                <div className={styles.jarIllustration}><span></span><i></i><strong>{stock.length}</strong><small>items in stock</small></div>
            </div>
            <div className={styles.alertStrip}><FiAlertCircle aria-hidden="true" /><p><strong>{lowStock} low-stock items</strong> and <strong>{expiring} expiring soon</strong>. Check these before your next shop.</p></div>
            <section className={styles.inventoryPanel} aria-label="Pantry inventory">
                <div className={styles.panelHeading}><div><h2>On the shelves</h2><p>Update a quantity as you use something.</p></div><label className={styles.searchBox}><FiSearch aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search pantry" aria-label="Search pantry items" /></label></div>
                <div className={styles.toolbar}>
                    <div className={styles.pills} role="group" aria-label="Filter stock">{["Everything", "Low stock", "Expiring"].map((option) => <button key={option} type="button" className={filter === option ? styles.activePill : ""} onClick={() => setFilter(option)}>{option}</button>)}</div>
                    <label>Shelf<select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((value) => <option key={value}>{value}</option>)}</select></label>
                </div>
                <div className={styles.stockTable}>
                    <div className={styles.tableHeader}><span>Item</span><span>Quantity</span><span>Use by</span><span>Status</span><span></span></div>
                    {visibleStock.map((item) => {
                        const low = item.quantity <= item.minimum;
                        const soon = item.expiry <= dateAfter(7);
                        return <div className={styles.stockRow} key={item.id}>
                            <div className={styles.itemCell}><span className={styles.categoryMark}>{item.category.slice(0, 1)}</span><div><strong>{item.name}</strong><small>{item.category}</small></div></div>
                            <div className={styles.quantityControl}><button type="button" aria-label={"Use one " + item.name} disabled={item.quantity === 0} onClick={() => changeQuantity(item.id, -1)}><FiMinus aria-hidden="true" /></button><strong>{item.quantity}</strong><span>{item.unit}</span><button type="button" aria-label={"Add one " + item.name} onClick={() => changeQuantity(item.id, 1)}><FiPlus aria-hidden="true" /></button></div>
                            <span className={styles.expiry}>{shortDate(item.expiry)}</span>
                            <span className={low ? styles.lowBadge : soon ? styles.soonBadge : styles.goodBadge}>{low ? "Restock" : soon ? "Use soon" : "In stock"}</span>
                            <button type="button" className={styles.deleteButton} aria-label={"Delete " + item.name} onClick={() => setPendingDelete(item)}><FiTrash2 aria-hidden="true" /></button>
                        </div>;
                    })}
                    {visibleStock.length === 0 && <p className={styles.emptyState}>No pantry items match those filters.</p>}
                </div>
            </section>
            <form className={styles.addForm} id="add" onSubmit={addItem}>
                <div className={styles.formTitle}><span><FiPlus aria-hidden="true" /></span><div><h2>Add pantry item</h2><p>Keep a rough count of staples.</p></div></div>
                <label>Name<input required maxLength={80} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="e.g. Lentils" /></label>
                <label>Shelf<select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>{["Tins & jars", "Grains", "Breakfast", "Cooking", "Baking", "Other"].map((value) => <option key={value}>{value}</option>)}</select></label>
                <label>Quantity<input required type="number" min="0" value={draft.quantity} onChange={(event) => setDraft({ ...draft, quantity: event.target.value })} /></label>
                <label>Unit<input required maxLength={20} value={draft.unit} onChange={(event) => setDraft({ ...draft, unit: event.target.value })} /></label>
                <label>Restock at<input required type="number" min="0" value={draft.minimum} onChange={(event) => setDraft({ ...draft, minimum: event.target.value })} /></label>
                <label>Use by<input required type="date" value={draft.expiry} onChange={(event) => setDraft({ ...draft, expiry: event.target.value })} /></label>
                <button type="submit" className={styles.addButton}>Add to pantry <FiPlus aria-hidden="true" /></button>
            </form>
            <p className={styles.storageNote}>{storageUnavailable ? "Browser storage is unavailable. Inventory changes will only last for this session." : "Inventory is saved in this browser. Counts are for planning, not barcode-level tracking."}</p>
            {pendingDelete && <ConfirmDialog title="Remove this pantry item?" description={"“" + pendingDelete.name + "” will be removed from your inventory."} onCancel={() => setPendingDelete(null)} onConfirm={removeItem} />}
        </section>
    );
};

export default PantryInventoryManager;
