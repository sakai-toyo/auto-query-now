// 設定のデフォルト構造
function createDefaultConfig() {
  return {
    id: Date.now() + Math.random(),
    queryParam: 'myquery',
    pressEnterKey: true,
    enabled: true
  };
}

// 設定アイテムのHTMLを生成
function createConfigHTML(config, index) {
  return `
    <div class="config-item" data-index="${index}">
      <div class="config-header">
        <h3>設定 ${index + 1}</h3>
        <button class="btn-danger delete-config" data-index="${index}">削除</button>
      </div>

      <div class="form-group">
        <label for="queryParam-${index}">URLクエリパラメータ名</label>
        <input
          type="text"
          id="queryParam-${index}"
          class="queryParam"
          value="${config.queryParam}"
          placeholder="例: my_query"
        />
        <div class="help-text">URLの ?my_query=値 の部分で指定するパラメータ名。値がフォーカスされた入力欄に自動入力されます。</div>
      </div>

      <div class="form-group">
        <label>
          <input
            type="checkbox"
            class="pressEnterKey"
            ${config.pressEnterKey ? 'checked' : ''}
          />
          <span class="checkbox-label">貼り付け後にEnterキーを押す</span>
        </label>
      </div>

      <div class="form-group">
        <label>
          <input
            type="checkbox"
            class="enabled"
            ${config.enabled ? 'checked' : ''}
          />
          <span class="checkbox-label">この設定を有効にする</span>
        </label>
      </div>
    </div>
  `;
}

// 設定を画面に表示
function renderConfigs(configs) {
  const configsList = document.getElementById('configsList');

  if (configs.length === 0) {
    configsList.innerHTML = '<p style="color: #888;">設定がありません。「新しい設定を追加」ボタンをクリックして設定を追加してください。</p>';
    return;
  }

  configsList.innerHTML = configs.map((config, index) =>
    createConfigHTML(config, index)
  ).join('');

  // 削除ボタンのイベントリスナーを設定
  document.querySelectorAll('.delete-config').forEach(button => {
    button.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      deleteConfig(index);
    });
  });
}

// 画面から設定を読み取る
function readConfigsFromDOM() {
  const configItems = document.querySelectorAll('.config-item');
  const configs = [];

  configItems.forEach((item, index) => {
    const config = {
      id: Date.now() + index,
      queryParam: item.querySelector('.queryParam').value.trim(),
      pressEnterKey: item.querySelector('.pressEnterKey').checked,
      enabled: item.querySelector('.enabled').checked
    };
    configs.push(config);
  });

  return configs;
}

// 設定を保存
async function saveConfigs() {
  const configs = readConfigsFromDOM();

  // バリデーション
  for (let i = 0; i < configs.length; i++) {
    if (!configs[i].queryParam) {
      showStatus(`設定 ${i + 1}: クエリパラメータ名は必須です`, 'error');
      return;
    }
  }

  try {
    await chrome.storage.sync.set({ autoQueryConfigs: configs });
    showStatus('設定を保存しました', 'success');
  } catch (error) {
    showStatus('保存に失敗しました: ' + error.message, 'error');
  }
}

// 設定を読み込み
async function loadConfigs() {
  try {
    const result = await chrome.storage.sync.get(['autoQueryConfigs']);
    let configs = result.autoQueryConfigs || [];

    // 初回起動時：設定が空の場合はデフォルト設定を1つ追加
    if (configs.length === 0) {
      configs = [createDefaultConfig()];
    }

    renderConfigs(configs);
  } catch (error) {
    console.error('Error loading configs:', error);
    showStatus('設定の読み込みに失敗しました', 'error');
  }
}

// 新しい設定を追加
function addConfig() {
  const configs = readConfigsFromDOM();
  configs.push(createDefaultConfig());
  renderConfigs(configs);
}

// 設定を削除
function deleteConfig(index) {
  if (!confirm(`設定 ${index + 1} を削除してもよろしいですか？`)) {
    return;
  }

  const configs = readConfigsFromDOM();
  configs.splice(index, 1);
  renderConfigs(configs);
}

// ステータスメッセージを表示
function showStatus(message, type = 'success') {
  const statusDiv = document.getElementById('statusMessage');
  statusDiv.textContent = message;
  statusDiv.className = `status-message ${type}`;
  statusDiv.style.display = 'block';

  setTimeout(() => {
    statusDiv.style.display = 'none';
  }, 3000);
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  loadConfigs();

  document.getElementById('addConfig').addEventListener('click', addConfig);
  document.getElementById('saveConfigs').addEventListener('click', saveConfigs);
});
