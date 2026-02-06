# Accuracy Verification - Sample URLs

このファイルは精度検証用のサンプルURLリストです。
各URLに対して期待される結果を記録します。

## Format
```
URL, Plushie, Expected Size, Expected Status, Site
```

## Japanese Sites - うなえさん (12cm)

### minne
https://minne.com/items/example1, unae, 10-12cm, perfect, minne
https://minne.com/items/example2, unae, 15cm, tight, minne

### Creema  
https://www.creema.jp/item/example1, unae, 12cm, perfect, creema
https://www.creema.jp/item/example2, unae, 10-15cm, perfect, creema

### WEGO
https://wego.jp/shop/example1, unae, 12cm, perfect, wego
https://wego.jp/shop/example2, unae, 20cm, tight, wego

### Yuzawaya
https://www.yuzawaya.shop/example1, unae, 12cm, perfect, yuzawaya

## American Sites - うなえさん (12cm)

### Amazon US
https://www.amazon.com/dp/example1, unae, 12-16inch, perfect, amazon
https://www.amazon.com/dp/example2, unae, 10inch, loose, amazon

### Etsy
https://www.etsy.com/listing/example1, unae, 12cm, perfect, etsy
https://www.etsy.com/listing/example2, unae, 5inch, perfect, etsy

## おじさん (身長を入力してください)

### minne
https://minne.com/items/example3, ojisan, 20cm, perfect, minne

---

## 使い方

1. このファイルに実際のURLを追加する
2. `test_accuracy.js` の TEST_CASES 配列を自動生成するか、手動で更新する
3. `node test_accuracy.js` を実行する

## 自動変換スクリプト (オプション)

```javascript
// このCSVファイルを読み込んでTEST_CASESを生成するヘルパー
import fs from 'fs';

const csv = fs.readFileSync('test_urls.csv', 'utf-8');
const lines = csv.split('\n').filter(l => l && !l.startsWith('#') && !l.startsWith('URL'));

const testCases = lines.map(line => {
    const [url, plushie, expectedSize, expectedStatus, site] = line.split(',').map(s => s.trim());
    return {
        url,
        plushie,
        expectedSize,
        expectedStatus,
        site,
        enabled: true
    };
});

console.log(JSON.stringify(testCases, null, 2));
```
