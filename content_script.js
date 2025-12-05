// URLからクエリパラメータを取得
function getQueryParams() {
  const params = new URLSearchParams(window.location.search);
  const queryParams = {};
  for (const [key, value] of params.entries()) {
    queryParams[key] = value;
  }
  return queryParams;
}

// 入力欄にEnterキーイベントを送信
function pressEnter(element) {
  const enterEvent = new KeyboardEvent('keydown', {
    key: 'Enter',
    code: 'Enter',
    keyCode: 13,
    which: 13,
    bubbles: true,
    cancelable: true
  });
  element.dispatchEvent(enterEvent);

  const keyupEvent = new KeyboardEvent('keyup', {
    key: 'Enter',
    code: 'Enter',
    keyCode: 13,
    which: 13,
    bubbles: true,
    cancelable: true
  });
  element.dispatchEvent(keyupEvent);

  // フォームのsubmitイベントもトリガー
  const form = element.closest('form');
  if (form) {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  }
}

// 入力欄に値を設定（貼り付けのシミュレーション）
function setValue(element, value) {
  try {
    // contentEditableの場合
    if (element.isContentEditable) {
      element.textContent = value;
      element.innerHTML = value;

      // カーソルを最後に移動
      const range = document.createRange();
      const sel = window.getSelection();
      if (element.childNodes.length > 0) {
        range.setStart(element.childNodes[0], element.childNodes[0].length || 0);
      } else {
        range.selectNodeContents(element);
      }
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
    // 通常のinput/textareaの場合
    else {
      // React等のフレームワーク対応
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        element.tagName === 'TEXTAREA'
          ? window.HTMLTextAreaElement.prototype
          : window.HTMLInputElement.prototype,
        'value'
      );

      if (nativeInputValueSetter && nativeInputValueSetter.set) {
        nativeInputValueSetter.set.call(element, value);
      } else {
        element.value = value;
      }
    }

    // 各種イベントを発火（フレームワーク対応）
    element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
    element.dispatchEvent(new Event('keydown', { bubbles: true, cancelable: true }));
    element.dispatchEvent(new Event('keyup', { bubbles: true, cancelable: true }));

    // React対応の追加イベント
    const inputEvent = new InputEvent('input', {
      bubbles: true,
      cancelable: true,
      inputType: 'insertText',
      data: value
    });
    element.dispatchEvent(inputEvent);

  } catch (error) {
    console.error('[Auto Query Now] Error setting value:', error);
  }
}

// フォーカスされた入力欄が見つかるまで待機
async function waitForFocusedInput(maxAttempts = 20, interval = 500) {
  for (let i = 0; i < maxAttempts; i++) {
    const activeElement = document.activeElement;

    // 入力可能な要素かチェック
    if (activeElement &&
        (activeElement.tagName === 'INPUT' ||
         activeElement.tagName === 'TEXTAREA' ||
         activeElement.isContentEditable)) {
      return activeElement;
    }

    console.log(`[Auto Query Now] Waiting for focused input (attempt ${i + 1}/${maxAttempts})`);
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  return null;
}

// クエリパラメータに基づいて貼り付けを実行
async function applyAutoQuery(config, queryParams) {
  const { queryParam, pressEnterKey } = config;

  // クエリパラメータが存在するかチェック
  if (!queryParams[queryParam]) {
    console.log(`[Auto Query Now] Query parameter not found: ${queryParam}`);
    return;
  }

  const value = queryParams[queryParam];
  console.log(`[Auto Query Now] Found query parameter ${queryParam}:`, value);

  // フォーカスされた入力欄を待機
  const element = await waitForFocusedInput();

  if (element) {
    console.log(`[Auto Query Now] Found focused element:`, element);

    // 少し待機してから値を設定
    await new Promise(resolve => setTimeout(resolve, 300));

    setValue(element, value);
    console.log(`[Auto Query Now] Set value:`, value);

    if (pressEnterKey) {
      // 少し遅延を入れてEnterキーを押す
      await new Promise(resolve => setTimeout(resolve, 500));
      pressEnter(element);
      console.log(`[Auto Query Now] Pressed Enter`);
    }
  } else {
    console.log(`[Auto Query Now] No focused input element found after waiting`);
  }
}

// 設定を読み込んで自動入力を実行
async function init() {
  try {
    console.log('[Auto Query Now] Initializing...');

    // ストレージから設定を取得
    const result = await chrome.storage.sync.get(['autoQueryConfigs']);
    const configs = result.autoQueryConfigs || [];

    if (configs.length === 0) {
      console.log('[Auto Query Now] No configurations found');
      return;
    }

    // URLパラメータを取得
    const queryParams = getQueryParams();

    if (Object.keys(queryParams).length === 0) {
      console.log('[Auto Query Now] No query parameters found in URL');
      return;
    }

    console.log('[Auto Query Now] Query parameters:', queryParams);
    console.log('[Auto Query Now] Applying configurations:', configs);

    // 各設定を順番に適用（await を使用）
    for (const config of configs) {
      if (config.enabled !== false) {
        await applyAutoQuery(config, queryParams);
      }
    }

    console.log('[Auto Query Now] All configurations applied');

  } catch (error) {
    console.error('[Auto Query Now] Error:', error);
  }
}

// ページが完全に読み込まれるまで待機
function waitForPageLoad() {
  return new Promise((resolve) => {
    if (document.readyState === 'complete') {
      resolve();
    } else {
      window.addEventListener('load', resolve);
    }
  });
}

// ページ読み込み完了後に実行
(async function() {
  // ページが完全に読み込まれるまで待機
  await waitForPageLoad();

  // 追加で少し待機（動的コンテンツのため）
  await new Promise(resolve => setTimeout(resolve, 500));

  // 初期化を実行
  await init();
})();
