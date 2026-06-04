// ==========================================
// Fast Tool - 快捷导航工具 (Main Application Logic)
// ==========================================

// ---------- Application State ----------
let appData = { categories: [], theme: 'dark' };
let currentCategoryId = null;
let searchQuery = '';
let modalMode = null;   // 'addCategory' | 'editCategory' | 'addItem' | 'editItem' | 'confirm'
let modalData = null;
let selectedEmoji = '📁';

// ---------- Emoji Groups ----------
const EMOJI_GROUPS = {
  '常用': ['📁','📂','📄','📋','📝','📊','📈','🗂️','🗃️','🔧','🔨','🛠️','⚙️','💻','🖥️','🌐','🔗','📌','🎯','💡','⭐','❤️','🔥','🚀'],
  '文件': ['📁','📂','📄','📃','📋','📝','📑','📊','📈','📉','🗂️','🗃️','🗄️','📎','📐','📏','🗒️','🗓️','📆','📅','📇','📰','🗞️','📓'],
  '工具': ['🔧','🔨','🛠️','⚙️','🔩','🔗','💻','🖥️','⌨️','🖱️','💾','📡','🔋','🔌','🧲','🔬','🔭','💿','📀','🖨️','📠','📟','🧰','🪛'],
  '标记': ['📌','📍','🏷️','🎯','💡','⭐','💎','❤️','🔥','✅','❌','⚠️','🔔','💬','🎨','🏆','👍','✨','🎉','🎊','🏅','🥇','💪','👑'],
  '场所': ['🏠','🏢','🏗️','🏭','🏛️','🏫','🏥','🏪','🏣','🏤','🏦','🌆','🌇','🌃','🏙️','🌉','🗼','🏰','🏯','⛪'],
  '网络': ['🌐','🔍','🔎','📧','📮','📬','📭','📫','📪','💌','📨','📩','🔒','🔓','🔑','🛡️','📲','📱','☁️','💬']
};

// ---------- Default Data ----------
function getDefaultData() {
  return {
    categories: [
      {
        id: generateId(),
        name: '本地目录',
        icon: '📁',
        items: [
          { id: generateId(), name: '用户目录', path: 'C:\\Users', type: 'folder' }
        ]
      },
      {
        id: generateId(),
        name: '常用网址',
        icon: '🌐',
        items: [
          { id: generateId(), name: '百度', path: 'https://www.baidu.com', type: 'url' }
        ]
      }
    ]
  };
}

// ==========================================
// Utility Functions
// ==========================================

function generateId() {
  return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function copyToClipboard(text, message) {
  try {
    await Neutralino.clipboard.writeText(text);
    showToast(message || '已复制到剪贴板');
  } catch (e) {
    // Fallback
    try {
      await navigator.clipboard.writeText(text);
      showToast(message || '已复制到剪贴板');
    } catch (e2) {
      showToast('复制失败', 'error');
    }
  }
}

// ==========================================
// Data Persistence
// ==========================================

let customDataPath = null;

async function getDataPath() {
  if (customDataPath) {
    return customDataPath;
  }
  try {
    const appDataFolder = await Neutralino.os.getPath('data');
    const appFolder = appDataFolder + '/fast-tool';
    try {
      await Neutralino.filesystem.createDirectory(appFolder);
    } catch (dirErr) {
      // Folder might already exist, which is fine
    }
    customDataPath = appFolder + '/data.json';
    return customDataPath;
  } catch (e) {
    console.error('Failed to get AppData directory, falling back to local path:', e);
    customDataPath = NL_PATH + '/data.json';
    return customDataPath;
  }
}

async function loadData() {
  try {
    const dataPath = await getDataPath();
    let content;
    let migrated = false;
    
    try {
      content = await Neutralino.filesystem.readFile(dataPath);
    } catch (readAppErr) {
      // AppData file not found, check local path for migration
      const localPath = NL_PATH + '/data.json';
      try {
        content = await Neutralino.filesystem.readFile(localPath);
        migrated = true;
        console.log('Migrated data from local file to AppData');
      } catch (readLocalErr) {
        // Neither exists, throw to trigger default creation
        throw new Error('No data file exists');
      }
    }

    appData = JSON.parse(content);
    if (!appData.theme) appData.theme = 'dark';
    applyTheme();
    console.log('Data loaded successfully. Categories:', appData.categories.length);
    
    if (migrated) {
      await saveData();
    }
  } catch (e) {
    console.log('No existing data file found, creating with defaults...');
    appData = getDefaultData();
    appData.theme = 'dark';
    applyTheme();
    await saveData();
  }
}

async function saveData() {
  try {
    const dataPath = await getDataPath();
    await Neutralino.filesystem.writeFile(dataPath, JSON.stringify(appData, null, 2));
  } catch (e) {
    console.error('Error saving data:', e);
    showToast('保存数据失败', 'error');
  }
}

// ==========================================
// Category Operations
// ==========================================

async function addCategory(name, icon) {
  const category = {
    id: generateId(),
    name: name.trim(),
    icon: icon || '📁',
    items: []
  };
  appData.categories.push(category);
  await saveData();
  currentCategoryId = category.id;
  render();
  showToast('分类 "' + name + '" 已添加');
}

async function updateCategory(id, name, icon) {
  const cat = appData.categories.find(c => c.id === id);
  if (cat) {
    cat.name = name.trim();
    cat.icon = icon;
    await saveData();
    render();
    showToast('分类已更新');
  }
}

async function deleteCategory(id) {
  const idx = appData.categories.findIndex(c => c.id === id);
  if (idx !== -1) {
    const name = appData.categories[idx].name;
    appData.categories.splice(idx, 1);
    if (currentCategoryId === id) {
      currentCategoryId = appData.categories.length > 0 ? appData.categories[0].id : null;
    }
    await saveData();
    render();
    showToast('分类 "' + name + '" 已删除');
  }
}

function selectCategory(id) {
  currentCategoryId = id;
  searchQuery = '';
  document.getElementById('search-input').value = '';
  document.getElementById('search-clear').style.display = 'none';
  render();
}

// ==========================================
// Item Operations
// ==========================================

async function addItem(name, path, type, account, password) {
  if (!currentCategoryId) return;
  const cat = appData.categories.find(c => c.id === currentCategoryId);
  if (cat) {
    const newItem = {
      id: generateId(),
      name: name.trim(),
      path: path.trim(),
      type: type
    };
    if (account) newItem.account = account;
    if (password) newItem.password = password;
    cat.items.push(newItem);
    await saveData();
    render();
    showToast('条目 "' + name + '" 已添加');
  }
}

async function updateItem(categoryId, itemId, name, path, type, account, password) {
  const cat = appData.categories.find(c => c.id === categoryId);
  if (cat) {
    const item = cat.items.find(i => i.id === itemId);
    if (item) {
      item.name = name.trim();
      item.path = path.trim();
      item.type = type;
      item.account = account || '';
      item.password = password || '';
      await saveData();
      render();
      showToast('条目已更新');
    }
  }
}

async function deleteItem(categoryId, itemId) {
  const cat = appData.categories.find(c => c.id === categoryId);
  if (cat) {
    const item = cat.items.find(i => i.id === itemId);
    const name = item ? item.name : '';
    cat.items = cat.items.filter(i => i.id !== itemId);
    await saveData();
    render();
    showToast('条目 "' + name + '" 已删除');
  }
}

// ==========================================
// Open Item (Core Feature!)
// ==========================================

async function openItem(item) {
  try {
    if (item.type === 'url') {
      await Neutralino.os.open(item.path);
    } else if (item.type === 'folder') {
      // Normalize to backslashes for Windows
      const normalizedPath = item.path.replace(/\//g, '\\');
      await Neutralino.os.execCommand(`explorer "${normalizedPath}"`, { background: true });
    }
  } catch (e) {
    console.error('Error opening item:', e);
    showToast('打开失败: ' + (e.message || '未知错误'), 'error');
  }
}

// ==========================================
// Search
// ==========================================

function getFilteredItems() {
  if (!searchQuery) {
    if (!currentCategoryId) return [];
    const cat = appData.categories.find(c => c.id === currentCategoryId);
    return cat ? cat.items.map(item => ({ ...item, categoryId: cat.id })).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)) : [];
  }

  // Search across ALL categories
  const results = [];
  const query = searchQuery.toLowerCase();
  appData.categories.forEach(cat => {
    cat.items.forEach(item => {
      if (item.name.toLowerCase().includes(query) || item.path.toLowerCase().includes(query) || (item.account && item.account.toLowerCase().includes(query))) {
        results.push({ ...item, categoryName: cat.name, categoryIcon: cat.icon, categoryId: cat.id });
      }
    });
  });
  return results.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
}

// ==========================================
// UI Rendering
// ==========================================

function render() {
  renderCategories();
  renderItems();
  updateContentHeader();
}

function renderCategories() {
  const list = document.getElementById('category-list');
  list.innerHTML = '';

  appData.categories.forEach(cat => {
    const li = document.createElement('li');
    li.className = 'category-item' + (cat.id === currentCategoryId && !searchQuery ? ' active' : '');
    li.dataset.id = cat.id;
    li.innerHTML = `
      <span class="category-icon">${cat.icon}</span>
      <span class="category-name">${escapeHtml(cat.name)}</span>
      <span class="category-count">${cat.items.length}</span>
    `;

    li.addEventListener('click', () => selectCategory(cat.id));

    li.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showContextMenu(e.clientX, e.clientY, [
        { label: '编辑分类', icon: '✏️', action: () => showCategoryModal(cat) },
        { label: '删除分类', icon: '🗑️', action: () => confirmDelete(
          '确定要删除分类 "' + cat.name + '" 及其所有条目吗？',
          () => deleteCategory(cat.id)
        )}
      ]);
    });

    list.appendChild(li);
  });
}

function renderItems() {
  const grid = document.getElementById('items-grid');
  const addBtn = document.getElementById('add-item-btn');
  const isSearching = searchQuery.length > 0;
  const items = getFilteredItems();

  grid.innerHTML = '';

  // No category selected and not searching
  if (!currentCategoryId && !isSearching) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <h3>选择一个分类开始</h3>
        <p>从左侧选择一个分类，或点击下方创建新的分类</p>
      </div>
    `;
    addBtn.style.display = 'none';
    return;
  }

  // No items found
  if (items.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">${isSearching ? '🔍' : '📭'}</div>
        <h3>${isSearching ? '未找到匹配的条目' : '暂无条目'}</h3>
        <p>${isSearching ? '尝试不同的搜索关键词' : '点击下方按钮添加新的条目'}</p>
      </div>
    `;
    addBtn.style.display = isSearching ? 'none' : 'flex';
    return;
  }

  // Render item cards
  items.forEach(item => {
    const card = document.createElement('div');
    card.className = `item-card ${item.pinned ? 'is-pinned' : ''}`.trim();
    card.dataset.id = item.id;

    const typeIcon = item.type === 'url' ? '🌐' : '📁';
    const typeLabel = item.type === 'url' ? '网页' : '文件夹';
    const categoryTag = item.categoryName
      ? `<span class="item-category-tag">${item.categoryIcon || ''} ${escapeHtml(item.categoryName)}</span>`
      : '';
    const hasCredentials = item.account || item.password;

    card.innerHTML = `
      <div class="card-header">
        <span class="card-type-icon">${typeIcon}</span>
        <div class="card-actions">
          <button class="card-action-btn pin-btn" title="${item.pinned ? '取消置顶' : '置顶'}">${item.pinned ? '🌟' : '⭐'}</button>
          <button class="card-action-btn edit-btn" title="编辑">✏️</button>
          <button class="card-action-btn delete-btn" title="删除">🗑️</button>
        </div>
      </div>
      <div class="card-body">
        <h4 class="card-title">${escapeHtml(item.name)}</h4>
        <p class="card-path" title="${escapeHtml(item.path)}">${escapeHtml(item.path)}</p>
      </div>
      <div class="card-footer">
        <span class="card-type-label">${typeLabel}</span>
        ${categoryTag}
      </div>
      ${hasCredentials ? `
      <div class="card-credentials">
        ${item.account ? `
        <div class="credential-row">
          <span class="credential-icon">👤</span>
          <span class="credential-text">${escapeHtml(item.account)}</span>
          <button class="credential-btn copy-account-btn" title="复制账号">📋</button>
        </div>` : ''}
        ${item.password ? `
        <div class="credential-row">
          <span class="credential-icon">🔑</span>
          <span class="credential-text password-display">••••••</span>
          <button class="credential-btn toggle-pwd-btn" title="显示/隐藏">👁</button>
          <button class="credential-btn copy-pwd-btn" title="复制密码">📋</button>
        </div>` : ''}
      </div>` : ''}
    `;

    // Click card body to open
    card.addEventListener('click', (e) => {
      if (e.target.closest('.card-action-btn') || e.target.closest('.card-credentials')) return;
      openItem(item);
    });

    // Edit button
    card.querySelector('.edit-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      showItemModal(item, item.categoryId || currentCategoryId);
    });

    // Pin button
    card.querySelector('.pin-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      item.pinned = !item.pinned;
      const cat = appData.categories.find(c => c.id === (item.categoryId || currentCategoryId));
      if (cat) {
        const realItem = cat.items.find(i => i.id === item.id);
        if (realItem) realItem.pinned = item.pinned;
        await saveData();
        render();
      }
    });

    // Delete button
    card.querySelector('.delete-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      const catId = item.categoryId || currentCategoryId;
      confirmDelete(
        '确定要删除条目 "' + item.name + '" 吗？',
        () => deleteItem(catId, item.id)
      );
    });

    // Credential buttons
    if (item.account) {
      card.querySelector('.copy-account-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        copyToClipboard(item.account, '账号已复制');
      });
    }
    if (item.password) {
      let pwdVisible = false;
      const pwdEl = card.querySelector('.password-display');
      card.querySelector('.toggle-pwd-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        pwdVisible = !pwdVisible;
        pwdEl.textContent = pwdVisible ? item.password : '••••••';
        e.currentTarget.textContent = pwdVisible ? '🙈' : '👁';
      });
      card.querySelector('.copy-pwd-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        copyToClipboard(item.password, '密码已复制');
      });
    }

    grid.appendChild(card);
  });

  addBtn.style.display = isSearching ? 'none' : 'flex';
}

function updateContentHeader() {
  const nameEl = document.getElementById('current-category-name');
  const countEl = document.getElementById('item-count');

  if (searchQuery) {
    const results = getFilteredItems();
    nameEl.textContent = '🔍 搜索结果';
    countEl.textContent = results.length + ' 个匹配';
  } else if (currentCategoryId) {
    const cat = appData.categories.find(c => c.id === currentCategoryId);
    if (cat) {
      nameEl.textContent = cat.icon + ' ' + cat.name;
      countEl.textContent = cat.items.length + ' 个条目';
    }
  } else {
    nameEl.textContent = '🚀 Fast Tool';
    countEl.textContent = '';
  }
}

// ==========================================
// Modal: Category
// ==========================================

function showCategoryModal(category = null) {
  modalMode = category ? 'editCategory' : 'addCategory';
  modalData = category;
  selectedEmoji = category ? category.icon : '📁';

  const overlay = document.getElementById('modal-overlay');
  const title = document.getElementById('modal-title');
  const body = document.getElementById('modal-body');

  title.textContent = category ? '编辑分类' : '新建分类';

  body.innerHTML = `
    <div class="form-group">
      <label>分类图标</label>
      <div class="emoji-select-row">
        <button id="emoji-trigger" class="emoji-trigger" type="button">
          <span id="selected-emoji">${selectedEmoji}</span>
        </button>
        <span class="emoji-hint">点击选择图标</span>
      </div>
    </div>
    <div class="form-group">
      <label>分类名称</label>
      <input type="text" id="input-category-name" class="form-input"
             placeholder="请输入分类名称"
             value="${category ? escapeHtml(category.name) : ''}" />
    </div>
  `;

  overlay.style.display = 'flex';
  requestAnimationFrame(() => overlay.classList.add('show'));

  // Focus the name input
  setTimeout(() => document.getElementById('input-category-name').focus(), 100);

  // Emoji trigger
  document.getElementById('emoji-trigger').addEventListener('click', (e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    showEmojiPicker(rect.left, rect.bottom + 8, (emoji) => {
      selectedEmoji = emoji;
      document.getElementById('selected-emoji').textContent = emoji;
    });
  });
}

// ==========================================
// Modal: Item
// ==========================================

function showItemModal(item = null, categoryId = null) {
  modalMode = item ? 'editItem' : 'addItem';
  modalData = item ? { ...item, categoryId } : null;

  const overlay = document.getElementById('modal-overlay');
  const title = document.getElementById('modal-title');
  const body = document.getElementById('modal-body');

  title.textContent = item ? '编辑条目' : '添加条目';

  const itemType = item ? item.type : 'folder';

  body.innerHTML = `
    <div class="form-group">
      <label>条目名称</label>
      <input type="text" id="input-item-name" class="form-input"
             placeholder="请输入条目名称"
             value="${item ? escapeHtml(item.name) : ''}" />
    </div>
    <div class="form-group">
      <label>类型</label>
      <div class="type-selector">
        <button class="type-btn ${itemType === 'folder' ? 'active' : ''}" data-type="folder">
          <span>📁</span> 文件夹
        </button>
        <button class="type-btn ${itemType === 'url' ? 'active' : ''}" data-type="url">
          <span>🌐</span> 网页链接
        </button>
      </div>
    </div>
    <div class="form-group">
      <label id="path-label">${itemType === 'url' ? '网页地址' : '文件夹路径'}</label>
      <div class="path-input-row">
        <input type="text" id="input-item-path" class="form-input"
               placeholder="${itemType === 'url' ? '请输入网页地址' : '请输入或浏览选择文件夹路径'}"
               value="${item ? escapeHtml(item.path) : ''}" />
        <button id="browse-btn" class="btn btn-browse"
                style="display: ${itemType === 'folder' ? 'flex' : 'none'}">浏览</button>
      </div>
    </div>
    <div id="credentials-container" style="display: ${itemType === 'url' ? 'block' : 'none'}">
      <div class="form-group">
        <label>账号 <span class="label-optional">（选填）</span></label>
        <input type="text" id="input-item-account" class="form-input"
               placeholder="请输入账号"
               value="${item && item.account ? escapeHtml(item.account) : ''}" />
      </div>
      <div class="form-group">
        <label>密码 <span class="label-optional">（选填）</span></label>
        <div class="password-input-row">
          <input type="password" id="input-item-password" class="form-input"
                 placeholder="请输入密码"
                 value="${item && item.password ? escapeHtml(item.password) : ''}" />
          <button id="toggle-password-input" class="btn btn-browse" type="button">显示</button>
        </div>
      </div>
    </div>
  `;

  overlay.style.display = 'flex';
  requestAnimationFrame(() => overlay.classList.add('show'));

  setTimeout(() => document.getElementById('input-item-name').focus(), 100);

  // Type selector toggle
  body.querySelectorAll('.type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      body.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const type = btn.dataset.type;
      document.getElementById('path-label').textContent = type === 'url' ? '网页地址' : '文件夹路径';
      document.getElementById('input-item-path').placeholder = type === 'url' ? '请输入网页地址' : '请输入或浏览选择文件夹路径';
      document.getElementById('browse-btn').style.display = type === 'folder' ? 'flex' : 'none';
      document.getElementById('credentials-container').style.display = type === 'url' ? 'block' : 'none';
    });
  });

  // Browse folder button
  document.getElementById('browse-btn').addEventListener('click', async () => {
    try {
      const folder = await Neutralino.os.showFolderDialog('选择文件夹');
      if (folder) {
        document.getElementById('input-item-path').value = folder;
      }
    } catch (e) {
      console.error('Folder dialog error:', e);
    }
  });

  // Toggle password input visibility
  document.getElementById('toggle-password-input').addEventListener('click', () => {
    const pwdInput = document.getElementById('input-item-password');
    const btn = document.getElementById('toggle-password-input');
    if (pwdInput.type === 'password') {
      pwdInput.type = 'text';
      btn.textContent = '隐藏';
    } else {
      pwdInput.type = 'password';
      btn.textContent = '显示';
    }
  });
}

// ==========================================
// Modal: Confirm Delete
// ==========================================

function confirmDelete(message, onConfirm) {
  modalMode = 'confirm';
  modalData = { onConfirm };

  const overlay = document.getElementById('modal-overlay');
  const title = document.getElementById('modal-title');
  const body = document.getElementById('modal-body');

  title.textContent = '确认删除';
  body.innerHTML = `<p class="confirm-message">⚠️ ${escapeHtml(message)}</p>`;

  overlay.style.display = 'flex';
  requestAnimationFrame(() => overlay.classList.add('show'));
}

// ==========================================
// Modal: Common
// ==========================================

function hideModal() {
  const overlay = document.getElementById('modal-overlay');
  overlay.classList.remove('show');
  setTimeout(() => {
    overlay.style.display = 'none';
    modalMode = null;
    modalData = null;
  }, 250);
  hideEmojiPicker();
}

async function handleModalConfirm() {
  if (modalMode === 'confirm') {
    if (modalData && modalData.onConfirm) {
      modalData.onConfirm();
    }
    hideModal();
    return;
  }

  if (modalMode === 'addCategory' || modalMode === 'editCategory') {
    const name = document.getElementById('input-category-name').value.trim();
    if (!name) {
      showToast('请输入分类名称', 'error');
      document.getElementById('input-category-name').focus();
      return;
    }
    if (modalMode === 'addCategory') {
      await addCategory(name, selectedEmoji);
    } else {
      await updateCategory(modalData.id, name, selectedEmoji);
    }
  } else if (modalMode === 'addItem' || modalMode === 'editItem') {
    const name = document.getElementById('input-item-name').value.trim();
    const path = document.getElementById('input-item-path').value.trim();
    const activeTypeBtn = document.querySelector('.type-btn.active');
    const type = activeTypeBtn ? activeTypeBtn.dataset.type : 'folder';

    if (!name) {
      showToast('请输入条目名称', 'error');
      document.getElementById('input-item-name').focus();
      return;
    }
    if (!path) {
      showToast(type === 'url' ? '请输入网页地址' : '请输入文件夹路径', 'error');
      document.getElementById('input-item-path').focus();
      return;
    }

    const account = document.getElementById('input-item-account').value.trim();
    const password = document.getElementById('input-item-password').value.trim();

    if (modalMode === 'addItem') {
      await addItem(name, path, type, account, password);
    } else {
      await updateItem(modalData.categoryId, modalData.id, name, path, type, account, password);
    }
  }

  hideModal();
}

// ==========================================
// Emoji Picker
// ==========================================

function showEmojiPicker(x, y, callback) {
  const picker = document.getElementById('emoji-picker');
  const groupNames = Object.keys(EMOJI_GROUPS);

  let html = '<div class="emoji-picker-tabs">';
  groupNames.forEach((name, i) => {
    html += `<button class="emoji-tab ${i === 0 ? 'active' : ''}" data-group="${name}">${name}</button>`;
  });
  html += '</div>';

  html += '<div class="emoji-picker-grid" id="emoji-grid">';
  EMOJI_GROUPS[groupNames[0]].forEach(emoji => {
    html += `<button class="emoji-btn">${emoji}</button>`;
  });
  html += '</div>';

  picker.innerHTML = html;
  picker.style.display = 'block';
  picker.style.left = x + 'px';
  picker.style.top = y + 'px';

  // Keep within viewport
  requestAnimationFrame(() => {
    const rect = picker.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      picker.style.left = (window.innerWidth - rect.width - 16) + 'px';
    }
    if (rect.bottom > window.innerHeight) {
      picker.style.top = (y - rect.height - 56) + 'px';
    }
  });

  // Tab switching
  picker.querySelectorAll('.emoji-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      picker.querySelectorAll('.emoji-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const grid = document.getElementById('emoji-grid');
      grid.innerHTML = EMOJI_GROUPS[tab.dataset.group]
        .map(e => `<button class="emoji-btn">${e}</button>`)
        .join('');

      // Re-bind emoji click
      grid.querySelectorAll('.emoji-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          callback(btn.textContent);
          hideEmojiPicker();
        });
      });
    });
  });

  // Emoji click
  picker.querySelectorAll('.emoji-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      callback(btn.textContent);
      hideEmojiPicker();
    });
  });
}

function hideEmojiPicker() {
  document.getElementById('emoji-picker').style.display = 'none';
}

// ==========================================
// Context Menu
// ==========================================

function showContextMenu(x, y, items) {
  const menu = document.getElementById('context-menu');
  const list = document.getElementById('context-menu-list');

  list.innerHTML = items.map((item, i) =>
    `<li class="context-item" data-index="${i}">
      <span class="context-icon">${item.icon}</span>
      <span>${escapeHtml(item.label)}</span>
    </li>`
  ).join('');

  menu.style.display = 'block';
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';

  // Keep within viewport
  requestAnimationFrame(() => {
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) menu.style.left = (x - rect.width) + 'px';
    if (rect.bottom > window.innerHeight) menu.style.top = (y - rect.height) + 'px';
  });

  list.querySelectorAll('.context-item').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.index);
      items[idx].action();
      hideContextMenu();
    });
  });
}

function hideContextMenu() {
  document.getElementById('context-menu').style.display = 'none';
}

// ==========================================
// Toast Notification
// ==========================================

let toastTimer = null;

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = (type === 'success' ? '✅ ' : '❌ ') + message;
  toast.className = 'toast show ' + type;

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

// ==========================================
// System Tray
// ==========================================

async function setupTray() {
  try {
    const tray = {
      icon: '/resources/icons/trayIcon.png',
      menuItems: [
        { id: 'show', text: '显示主窗口' },
        { text: '-' },
        { id: 'quit', text: '退出 Fast Tool' }
      ]
    };
    await Neutralino.os.setTray(tray);
  } catch (e) {
    console.warn('System tray setup failed:', e.message || e);
  }
}

// ==========================================
// Event Listeners
// ==========================================

function setupEventListeners() {
  // --- Theme Toggle ---
  document.getElementById('theme-toggle-btn').addEventListener('click', async () => {
    appData.theme = appData.theme === 'light' ? 'dark' : 'light';
    applyTheme();
    await saveData();
  });

  // --- Add Category ---
  document.getElementById('add-category-btn').addEventListener('click', () => {
    showCategoryModal();
  });

  // --- Add Item ---
  document.getElementById('add-item-btn').addEventListener('click', () => {
    showItemModal();
  });

  // --- Modal buttons ---
  document.getElementById('modal-close').addEventListener('click', hideModal);
  document.getElementById('modal-cancel').addEventListener('click', hideModal);
  document.getElementById('modal-confirm').addEventListener('click', handleModalConfirm);

  // --- Click overlay to close modal (prevent accidental close during text selection) ---
  let mouseDownOnOverlay = false;
  document.getElementById('modal-overlay').addEventListener('mousedown', (e) => {
    mouseDownOnOverlay = (e.target === e.currentTarget);
  });
  document.getElementById('modal-overlay').addEventListener('mouseup', (e) => {
    if (mouseDownOnOverlay && e.target === e.currentTarget) {
      hideModal();
    }
    mouseDownOnOverlay = false;
  });

  // --- Search ---
  const searchInput = document.getElementById('search-input');
  const searchClear = document.getElementById('search-clear');
  // Search input events
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    searchClear.style.display = searchQuery ? 'flex' : 'none';
    render();
  });

  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    searchClear.style.display = 'none';
    render();
  });

  // ==========================================
  // Global click: close menus
  // ==========================================
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#context-menu')) {
      hideContextMenu();
    }
    if (!e.target.closest('#emoji-picker') && !e.target.closest('#emoji-trigger')) {
      hideEmojiPicker();
    }
  });

  // --- Keyboard shortcuts ---
  document.addEventListener('keydown', (e) => {
    const modalVisible = document.getElementById('modal-overlay').style.display === 'flex';

    // Escape: close everything
    if (e.key === 'Escape') {
      if (modalVisible) hideModal();
      hideContextMenu();
      hideEmojiPicker();
    }

    // Enter in modal: confirm
    if (e.key === 'Enter' && modalVisible) {
      e.preventDefault();
      handleModalConfirm();
    }

    // Ctrl+F: focus search
    if (e.ctrlKey && e.key === 'f') {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    }
  });

  // --- Tray menu clicks ---
  Neutralino.events.on('trayMenuItemClicked', async (event) => {
    switch (event.detail.id) {
      case 'show':
        await Neutralino.window.show();
        await Neutralino.window.focus();
        break;
      case 'quit':
        Neutralino.app.exit();
        break;
    }
  });

  // --- Window close → hide to tray ---
  Neutralino.events.on('windowClose', async () => {
    try {
      await Neutralino.window.hide();
    } catch (e) {
      // If hide fails, actually exit
      Neutralino.app.exit();
    }
  });
}

function applyTheme() {
  const btn = document.getElementById('theme-toggle-btn');
  if (appData.theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    btn.textContent = '☀️';
  } else {
    document.documentElement.removeAttribute('data-theme');
    btn.textContent = '🌙';
  }
}

// ==========================================
// Initialization
// ==========================================

Neutralino.init();

Neutralino.events.on('ready', async () => {
  console.log('Fast Tool is starting...');

  // Load persisted data
  await loadData();

  // Select first category by default
  if (appData.categories.length > 0 && !currentCategoryId) {
    currentCategoryId = appData.categories[0].id;
  }

  // Setup UI and system features
  setupEventListeners();
  setupTray();
  render();

  console.log('Fast Tool is ready!');
});
