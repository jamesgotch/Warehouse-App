async function loadInventory() {
  const loading = document.getElementById('loading');
  const table = document.getElementById('inventory-table');
  const tbody = document.getElementById('inventory-body');
  const errorMsg = document.getElementById('error-msg');

  try {
    const response = await fetch('/inventory');
    if (!response.ok) throw new Error(`Server error: ${response.status}`);
    const items = await response.json();

    if (items.length === 0) {
      loading.textContent = 'No inventory items found.';
      return;
    }

    tbody.innerHTML = items.map(item => `
      <tr>
        <td>${item.id}</td>
        <td>${item.name}</td>
        <td>${item.category ?? '—'}</td>
        <td>${item.brand ?? '—'}</td>
        <td>${item.size ?? '—'}</td>
        <td>${item.color ?? '—'}</td>
        <td>${item.quantity}</td>
        <td>$${item.price.toFixed(2)}</td>
      </tr>
    `).join('');

    loading.hidden = true;
    table.hidden = false;
  } catch (err) {
    loading.hidden = true;
    errorMsg.textContent = `Failed to load inventory: ${err.message}`;
    errorMsg.hidden = false;
  }
}

loadInventory();
