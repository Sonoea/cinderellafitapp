import fs from 'fs';

// Node.js 18+ has native fetch support

/**
 * Automated Accuracy Verification Script
 * Tests size detection accuracy across multiple plushie clothing URLs
 */

// Test configuration
const API_BASE = 'http://localhost:3001';
const DELAY_MS = 1000; // Delay between requests to avoid rate limiting

// Plushie profiles
const PLUSHIES = {
    unae: {
        name: 'うなえさん',
        height: 12,
        measurements: {
            height: 12,
            waist: 15,
            head: 14,
            neck: 13,
            length: 8,
            shoulder: 0,
            arm: 3,
            armGirth: 3,
            leg: 0,
        }
    },
    ojisan: {
        name: 'おじさん',
        height: 20, // Default, update with actual measurements
        measurements: {
            height: 20,
            waist: 22,
            head: 18,
            neck: 15,
            length: 14,
            shoulder: 0,
            arm: 5,
            armGirth: 5,
            leg: 0,
        }
    }
};

// Test cases - Add URLs here
const TEST_CASES = [
    // Japanese sites - うなえさん (12cm) verification
    {
        url: 'https://www.creema.jp/item/16474163/detail',
        plushie: 'unae',
        expectedSize: '20cm',
        expectedStatus: 'loose', // 20cm用なので12cmには大きい
        site: 'creema',
        name: '20cmぬい服：うさ耳つきボーダーパーカー（白×黒）',
        enabled: true
    },
    {
        url: 'https://www.creema.jp/item/14299696/detail',
        plushie: 'unae',
        expectedSize: '10-12cm',
        expectedStatus: 'perfect', // 10cm/12cmぴったり
        site: 'creema',
        name: '10cm/12cmぬい服：シンプルＴシャツ',
        enabled: true
    },
    {
        url: 'https://minne.com/items/33947417',
        plushie: 'unae',
        expectedSize: '15-20cm',
        expectedStatus: 'loose', // 15cm/20cm用なので少し大きい
        site: 'minne',
        name: '15cm/20cmぬい用：たれ耳わんこのケープ',
        enabled: true
    },
    {
        url: 'https://minne.com/items/29037805',
        plushie: 'unae',
        expectedSize: '20cm',
        expectedStatus: 'loose', // 20cm用なので大きい
        site: 'minne',
        name: '20cmぬい用：制服セット（ブレザー・シャツ・ズボン）',
        enabled: true
    },
    {
        url: 'https://item.rakuten.co.jp/petitloup1969/801046/',
        plushie: 'unae',
        expectedSize: '12cm',
        expectedStatus: 'perfect', // 12cm用ぴったり
        site: 'rakuten',
        name: '12cmぬい用：テディベア専用 袴セット',
        enabled: true
    },
    {
        url: 'https://item.rakuten.co.jp/petitloup1969/700021/',
        plushie: 'unae',
        expectedSize: '20cm',
        expectedStatus: 'loose', // 20cm用なので大きい
        site: 'rakuten',
        name: '身長20cm用：サロペットパンツ',
        enabled: true
    },
    {
        url: 'https://www.amazon.co.jp/dp/B0CBV28N4H',
        plushie: 'unae',
        expectedSize: '20cm',
        expectedStatus: 'loose', // 20cm用なので大きい
        site: 'amazon_jp',
        name: '20cmぬい用：着ぐるみ風パジャマ（恐竜）',
        enabled: true
    },
    {
        url: 'https://www.amazon.co.jp/dp/B0CFQ21CH7',
        plushie: 'unae',
        expectedSize: '20cm',
        expectedStatus: 'loose', // 20cm用なので大きい
        site: 'amazon_jp',
        name: '20cmぬい用：アイドル風ジャケット衣装',
        enabled: true
    },
    {
        url: 'https://www.okadaya.co.jp/shop/g/g4582684803517/',
        plushie: 'unae',
        expectedSize: 'M',
        expectedStatus: 'unknown', // Mサイズ - 検出できるか確認
        site: 'okadaya',
        name: 'ぬい服：ぬいポニーケープ（Mサイズ用）',
        enabled: true
    },
    {
        url: 'https://jp.mercari.com/item/m32515549721',
        plushie: 'unae',
        expectedSize: '10cm',
        expectedStatus: 'tight', // 10cm用なので12cmには少し小さい
        site: 'mercari',
        name: '10cmぬい服：ハンドメイド サロペット',
        enabled: true
    },

    // US/Global sites - うなえさん (12cm ≈ 4.7 inches) verification
    {
        url: 'https://www.buildabear.com/red-panda-hoodie/032488.html',
        plushie: 'unae',
        expectedSize: '16-18inch', // Standard plush = 16-18 inch ≈ 40-45cm
        expectedStatus: 'loose', // 大きすぎる
        site: 'buildabear',
        name: 'Red Panda Hoodie (Standard Plush size)',
        enabled: true
    },
    {
        url: 'https://www.buildabear.com/denim-jeans/024669.html',
        plushie: 'unae',
        expectedSize: '16-18inch', // Standard size
        expectedStatus: 'loose',
        site: 'buildabear',
        name: 'Denim Jeans (Standard Size)',
        enabled: true
    },
    {
        url: 'https://www.amazon.com/dp/B07T9H3X2B',
        plushie: 'unae',
        expectedSize: '18inch', // 18インチ ≈ 45cm
        expectedStatus: 'loose', // 大きすぎる
        site: 'amazon_us',
        name: '18-inch Doll Clothes: 5 Sets Party Outfits',
        enabled: true
    },
    {
        url: 'https://www.amazon.com/dp/B09ST9F3T1',
        plushie: 'unae',
        expectedSize: '14-18inch', // 14-18インチ ≈ 35-45cm
        expectedStatus: 'loose', // 大きすぎる
        site: 'amazon_us',
        name: 'Outfit for 14-18 inch Stuffed Animals (Pink Hoodie)',
        enabled: true
    },
    {
        url: 'https://www.etsy.com/listing/1329245133/outfit-for-8-inch-plush',
        plushie: 'unae',
        expectedSize: '8inch', // 8インチ ≈ 20cm
        expectedStatus: 'loose', // 12cmには大きい
        site: 'etsy',
        name: 'Handmade Outfit for 8" Plushies (Custom Dress)',
        enabled: true
    },
    {
        url: 'https://www.etsy.com/listing/1126130325/tiny-knitted-sweater',
        plushie: 'unae',
        expectedSize: '4-6inch', // 4-6インチ ≈ 10-15cm
        expectedStatus: 'perfect', // 12cm前後でぴったり
        site: 'etsy',
        name: 'Tiny Knitted Sweater for Stuffed Animal (approx 4-6 inches)',
        enabled: true
    },
    {
        url: 'https://www.etsy.com/listing/741645318/wizard-witch-black-robe',
        plushie: 'unae',
        expectedSize: '16-18inch', // 16-18インチ ≈ 40-45cm
        expectedStatus: 'loose', // 大きすぎる
        site: 'etsy',
        name: 'Wizard Robe for 16-18 inch Bears',
        enabled: true
    },
    {
        url: 'https://www.walmart.com/ip/15-Stuffed-Animal-Clothes-Plaid-Pajamas/695844439',
        plushie: 'unae',
        expectedSize: '15inch', // 15インチ ≈ 38cm
        expectedStatus: 'loose', // 大きすぎる
        site: 'walmart',
        name: '15" Stuffed Animal Clothes: Plaid Pajamas',
        enabled: true
    },
    {
        url: 'https://www.ebay.com/itm/386123456789',
        plushie: 'unae',
        expectedSize: '12-14inch', // 12-14インチ ≈ 30-35cm
        expectedStatus: 'loose', // 大きい
        site: 'ebay',
        name: 'Vintage Teddy Bear Clothes: Overalls (Fits 12-14" bears)',
        enabled: true
    },
    {
        url: 'https://www.target.com/p/our-generation-regular-outfit-cat-s-pajamas-pjs/-/A-16406132',
        plushie: 'unae',
        expectedSize: '18inch', // 18インチドール用 ≈ 45cm
        expectedStatus: 'loose', // 大きすぎる
        site: 'target',
        name: 'Our Generation Doll Outfit: Regular Outfit (Fits 18" Dolls)',
        enabled: true
    }
];

// Utility function to delay execution
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Analyze a single URL
async function analyzeUrl(testCase) {
    const plushie = PLUSHIES[testCase.plushie];

    try {
        const response = await fetch(`${API_BASE}/api/analyze-url`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: testCase.url,
                plushieHeight: plushie.height,
                plushieInfo: plushie.measurements,
                lang: 'jp'
            }),
        });

        if (!response.ok) {
            return {
                success: false,
                error: `HTTP ${response.status}`,
                testCase
            };
        }

        const data = await response.json();

        return {
            success: data.success,
            url: testCase.url,
            site: testCase.site,
            plushie: testCase.plushie,
            expected: {
                size: testCase.expectedSize,
                status: testCase.expectedStatus
            },
            actual: {
                detectedSize: data.sizeInfo?.targetPlushieSize ||
                    (data.sizeInfo?.sizeRanges?.[0] ?
                        `${data.sizeInfo.sizeRanges[0].min}-${data.sizeInfo.sizeRanges[0].max}cm` :
                        'unknown'),
                status: data.fit?.status || 'unknown',
                confidence: data.fit?.confidence || 'n/a',
                reason: data.fit?.reason || 'no reason'
            },
            rawData: data,
            testCase
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            testCase
        };
    }
}

// Run all tests
async function runTests() {
    console.log('🧪 Starting Accuracy Verification Tests\n');
    console.log(`Total test cases: ${TEST_CASES.length}`);
    console.log(`Enabled test cases: ${TEST_CASES.filter(tc => tc.enabled).length}\n`);

    const results = [];
    const enabledCases = TEST_CASES.filter(tc => tc.enabled);

    for (let i = 0; i < enabledCases.length; i++) {
        const testCase = enabledCases[i];
        console.log(`[${i + 1}/${enabledCases.length}] Testing: ${testCase.url}`);

        const result = await analyzeUrl(testCase);
        results.push(result);

        if (result.success) {
            const match = result.expected.status === result.actual.status;
            console.log(`  ✓ Size: ${result.actual.detectedSize}`);
            console.log(`  ${match ? '✓' : '✗'} Status: ${result.actual.status} (expected: ${result.expected.status})`);
            console.log(`  Confidence: ${result.actual.confidence}`);
        } else {
            console.log(`  ✗ Error: ${result.error}`);
        }

        console.log('');

        // Delay to avoid overwhelming the server
        if (i < enabledCases.length - 1) {
            await delay(DELAY_MS);
        }
    }

    return results;
}

// Generate report
function generateReport(results) {
    const report = {
        summary: {
            total: results.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            accuracyByStatus: {},
            bySite: {},
            byPlushie: {}
        },
        details: results
    };

    // Calculate accuracy by status
    const successfulResults = results.filter(r => r.success);
    const statusMatches = successfulResults.filter(r => r.expected.status === r.actual.status).length;
    report.summary.statusAccuracy = successfulResults.length > 0
        ? `${((statusMatches / successfulResults.length) * 100).toFixed(1)}%`
        : 'N/A';

    // Group by site
    results.forEach(r => {
        const site = r.site || 'unknown';
        if (!report.summary.bySite[site]) {
            report.summary.bySite[site] = { total: 0, successful: 0, failed: 0 };
        }
        report.summary.bySite[site].total++;
        if (r.success) {
            report.summary.bySite[site].successful++;
        } else {
            report.summary.bySite[site].failed++;
        }
    });

    // Group by plushie
    results.forEach(r => {
        const plushie = r.plushie || 'unknown';
        if (!report.summary.byPlushie[plushie]) {
            report.summary.byPlushie[plushie] = { total: 0, successful: 0, failed: 0 };
        }
        report.summary.byPlushie[plushie].total++;
        if (r.success) {
            report.summary.byPlushie[plushie].successful++;
        } else {
            report.summary.byPlushie[plushie].failed++;
        }
    });

    return report;
}

// Main execution
async function main() {
    console.log('================================================');
    console.log('  Plushie Size Detection Accuracy Verification');
    console.log('================================================\n');

    if (TEST_CASES.filter(tc => tc.enabled).length === 0) {
        console.log('⚠️  No enabled test cases found!');
        console.log('Please add URLs to TEST_CASES array and set enabled: true\n');
        console.log('Example format:');
        console.log(`{
    url: 'https://example.com/item/123',
    plushie: 'unae',
    expectedSize: '10-12cm',
    expectedStatus: 'perfect',
    site: 'minne',
    enabled: true
}\n`);
        return;
    }

    // Run tests
    const results = await runTests();

    // Generate report
    const report = generateReport(results);

    // Print summary
    console.log('\n📊 Test Summary');
    console.log('================');
    console.log(`Total: ${report.summary.total}`);
    console.log(`✓ Successful: ${report.summary.successful}`);
    console.log(`✗ Failed: ${report.summary.failed}`);
    console.log(`Status Accuracy: ${report.summary.statusAccuracy}\n`);

    console.log('By Site:');
    Object.entries(report.summary.bySite).forEach(([site, stats]) => {
        console.log(`  ${site}: ${stats.successful}/${stats.total} (${((stats.successful / stats.total) * 100).toFixed(1)}%)`);
    });

    console.log('\nBy Plushie:');
    Object.entries(report.summary.byPlushie).forEach(([plushie, stats]) => {
        console.log(`  ${plushie}: ${stats.successful}/${stats.total} (${((stats.successful / stats.total) * 100).toFixed(1)}%)`);
    });

    // Save detailed report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = `./accuracy_report_${timestamp}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);

    // List failed cases
    const failedCases = results.filter(r => !r.success);
    if (failedCases.length > 0) {
        console.log('\n❌ Failed Cases:');
        failedCases.forEach(fc => {
            console.log(`  - ${fc.testCase.url}`);
            console.log(`    Error: ${fc.error}`);
        });
    }

    // List mismatched status
    const mismatchedCases = results.filter(r => r.success && r.expected.status !== r.actual.status);
    if (mismatchedCases.length > 0) {
        console.log('\n⚠️  Status Mismatches:');
        mismatchedCases.forEach(mc => {
            console.log(`  - ${mc.testCase.url}`);
            console.log(`    Expected: ${mc.expected.status}, Got: ${mc.actual.status}`);
            console.log(`    Reason: ${mc.actual.reason}`);
        });
    }

    console.log('\n✅ Verification complete!\n');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export { analyzeUrl, runTests, generateReport };
