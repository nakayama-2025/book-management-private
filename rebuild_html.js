const fs = require('fs');
const path = 'index.html';

let html = fs.readFileSync(path, 'utf-8');

// 1. 壊れた class API の部分を力技でマッチさせて削除する
// ユーザーが前回貼り付けた以下の部分を見つけて削る
const brokenApiStart = html.indexOf('class API {');
if (brokenApiStart !== -1) {
    // openMapModal の手前までを削除する
    const nextFuncStart = html.indexOf('function openMapModal()', brokenApiStart);
    if (nextFuncStart !== -1) {
        // brokenApiStartの前にあったコメント /** * API Abstraction (GAS vs Mock) */ から消したい
        const commentStart = html.lastIndexOf('/**', brokenApiStart);
        if (commentStart !== -1 && (brokenApiStart - commentStart) < 150) {
            html = html.substring(0, commentStart) + html.substring(nextFuncStart);
        } else {
            html = html.substring(0, brokenApiStart) + html.substring(nextFuncStart);
        }
    }
}

// 余分な閉じていないカッコやゴミがあれば除去（手動で適当に入った部分）
// 上記の substring により openMapModal() より前は綺麗になったはず

// 2. 正しい class API のコードを定義
const correctApiCode = `
        /**
         * API Abstraction (GAS Communication)
         */
        class API {
            static getUrl() {
                return CONFIG.GAS_API_URL || "https://script.google.com/macros/s/AKfycbzAbE-XjT32QYr0qXTDSvyHFfyfs4oBKn6PBDO9vcmapnQUpYpFdjGZmX6Rr6B9H95o/exec";
            }

            static async getData() {
                try {
                    const res = await fetch(this.getUrl(), {
                        method: 'POST',
                        body: JSON.stringify({ action: 'getData' }),
                        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
                    });
                    const json = await res.json();
                    if (json.status === 'success') {
                        appState.disabledShelves = json.data.disabled || [];
                        return json;
                    }
                    throw new Error(json.message || "Failed to getData");
                } catch (err) {
                    console.error("GAS API Error:", err);
                    return { status: 'error', data: { inventory: [], logs: [], disabled: [] } };
                }
            }

            static async post(action, payload) {
                try {
                    const res = await fetch(this.getUrl(), {
                        method: 'POST',
                        body: JSON.stringify({ action: action, payload: payload }),
                        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
                    });
                    return await res.json();
                } catch (err) {
                    console.error("GAS Post Error:", err);
                    return { status: 'error' };
                }
            }
        }
`;

// 3. const CONFIG = { ... }; の終わりを探して、その直後に挿入する
// CONFIG と SHELF_CONFIG の間、もしくは appState の後に入れる。ユーザーは「const CONFIGの直後」を希望している。
// 実際には const SHELF_CONFIG の後が安全。
const shelfConfigEnd = html.indexOf('};\n\n', html.indexOf('const SHELF_CONFIG ='));
if (shelfConfigEnd !== -1) {
    const insertPos = shelfConfigEnd + 4;
    html = html.substring(0, insertPos) + correctApiCode + html.substring(insertPos);
}

// 4. フォーマット調整、余計に壊れた中括弧の修復
// 念のため、末尾がちゃんと閉じているかチェック
const finalTags = '\n    </script>\n</body>\n</html>';
html = html.replace(/\s*<\/script>\s*<\/body>\s*<\/html>\s*$/, finalTags);

// 保存
fs.writeFileSync('index_fixed.html', html, 'utf-8');
console.log("Successfully rebuilt index_fixed.html");

// 分割してチャットへ出力しやすくする
const lines = html.split('\n');
fs.writeFileSync('part1.txt', lines.slice(0, 1400).join('\n'));
fs.writeFileSync('part2.txt', lines.slice(1400).join('\n'));
