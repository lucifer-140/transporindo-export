export default function ContainerInputRow({ container, index, onChange, onRemove }) {
  function update(field, value) {
    onChange(index, { ...container, [field]: value });
  }

  return (
    <div className="row" style={{ gap: 8, alignItems: "flex-end" }}>
      <div style={{ flex: 1 }}>
        <input
          type="text" placeholder="Container No (e.g. FFAU6615812)"
          value={container.container_no}
          onChange={(e) => update("container_no", e.target.value)}
          className="inp mono"
        />
      </div>
      <div style={{ width: 140 }}>
        <input
          type="text" placeholder="Seal No"
          value={container.seal_no}
          onChange={(e) => update("seal_no", e.target.value)}
          className="inp"
        />
      </div>
      <div style={{ width: 90 }}>
        <select
          value={container.size}
          onChange={(e) => update("size", e.target.value)}
          className="inp"
        >
          <option value="20">20ft</option>
          <option value="40">40ft</option>
        </select>
      </div>
      <button
        type="button" onClick={() => onRemove(index)}
        className="btn btn--ghost btn--icon btn--sm" style={{ color: "var(--danger)" }}
      >
        ×
      </button>
    </div>
  );
}
