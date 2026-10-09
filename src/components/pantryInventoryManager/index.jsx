import { useEffect, useMemo, useState } from "react";
import { FiAlertCircle, FiMinus, FiPlus, FiSearch, FiTrash2 } from "react-icons/fi";
import ConfirmDialog from "../confirmDialog";
import styles from "./styles.module.css";

const storageKey = "pantry-notes-inventory";
const dateAfter = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
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
        return saved ? JSON.parse(saved) : starterStock;
    } catch {
        return starterStock;
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
    useEffect(() => localStorage.setItem(storageKey, JSON.stringify(stock)), [stock]);

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
        setStock((current) => [...current, { ...draft, id: Date.now(), name: draft.name.trim(), quantity: Number(draft.quantity), minimum: Number(draft.minimum) }]);
        setDraft({ name: "", category: "Tins & jars", quantity: "1", unit: "items", minimum: "1", expiry: dateAfter(180) });
    };
    const changeQuantity = (id, amount) => setStock((current) => current.map((item) => item.id === id ? { ...item, quantity: Math.max(0, item.quantity + amount) } : item));
    const removeItem = () => {
        setStock((current) => current.filter((item) => item.id !== pendingDelete.id));
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
                <label>Name<input required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="e.g. Lentils" /></label>
                <label>Shelf<select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>{["Tins & jars", "Grains", "Breakfast", "Cooking", "Baking", "Other"].map((value) => <option key={value}>{value}</option>)}</select></label>
                <label>Quantity<input type="number" min="0" value={draft.quantity} onChange={(event) => setDraft({ ...draft, quantity: event.target.value })} /></label>
                <label>Unit<input value={draft.unit} onChange={(event) => setDraft({ ...draft, unit: event.target.value })} /></label>
                <label>Restock at<input type="number" min="0" value={draft.minimum} onChange={(event) => setDraft({ ...draft, minimum: event.target.value })} /></label>
                <label>Use by<input type="date" value={draft.expiry} onChange={(event) => setDraft({ ...draft, expiry: event.target.value })} /></label>
                <button type="submit" className={styles.addButton}>Add to pantry <FiPlus aria-hidden="true" /></button>
            </form>
            <p className={styles.storageNote}>Inventory is saved in this browser. Counts are for planning, not barcode-level tracking.</p>
            {pendingDelete && <ConfirmDialog title="Remove this pantry item?" description={"“" + pendingDelete.name + "” will be removed from your inventory."} onCancel={() => setPendingDelete(null)} onConfirm={removeItem} />}
        </section>
    );
};

export default PantryInventoryManager;
