import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, FileText, Mail, ChevronDown, ChevronUp } from 'lucide-react';
import { useApp } from '../context/AppContext';

const Legal = () => {
    const navigate = useNavigate();
    const { t, language } = useApp();
    const [expandedSection, setExpandedSection] = useState('privacy');

    const toggleSection = (section) => {
        setExpandedSection(expandedSection === section ? null : section);
    };

    return (
        <div className="pb-20">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-xl font-bold">
                    {language === 'jp' ? 'ご利用について' : 'Legal Information'}
                </h1>
            </div>

            {/* Privacy Policy Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-4 overflow-hidden">
                <button
                    onClick={() => toggleSection('privacy')}
                    className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Shield size={20} className="text-primary" />
                        </div>
                        <span className="font-bold">
                            {language === 'jp' ? 'プライバシーポリシー' : 'Privacy Policy'}
                        </span>
                    </div>
                    {expandedSection === 'privacy' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>

                {expandedSection === 'privacy' && (
                    <div className="px-4 pb-4 text-sm text-gray-600 space-y-4 border-t border-gray-100 pt-4">
                        {language === 'jp' ? (
                            <>
                                <p className="text-xs text-gray-400">最終更新日: 2026年1月28日</p>

                                <div>
                                    <h3 className="font-bold text-gray-800 mb-2">1. はじめに</h3>
                                    <p>CinderellaFit（以下「本サービス」）は、ぬいぐるみのサイズ計測とお洋服のフィッティングをサポートするサービスです。本プライバシーポリシーでは、お客様の個人情報の取り扱いについてご説明いたします。</p>
                                </div>

                                <div>
                                    <h3 className="font-bold text-gray-800 mb-2">2. 収集する情報</h3>
                                    <p>本サービスでは、以下の情報を収集・保存します：</p>
                                    <ul className="list-disc list-inside mt-2 space-y-1">
                                        <li><strong>ぬいぐるみの情報</strong>：名前、種類、画像、計測データ（身長、首回り、胸囲など）</li>
                                        <li><strong>クローゼット情報</strong>：登録したお洋服の画像、フィット評価、コメント</li>
                                        <li><strong>利用データ</strong>：アプリの使用状況に関する匿名データ</li>
                                    </ul>
                                </div>

                                <div>
                                    <h3 className="font-bold text-gray-800 mb-2">3. データの保存場所</h3>
                                    <p>現在、すべてのデータはお客様のデバイス（ブラウザのローカルストレージ）に保存されます。当社のサーバーにはデータは送信されません。</p>
                                </div>

                                <div>
                                    <h3 className="font-bold text-gray-800 mb-2">4. 第三者への提供</h3>
                                    <p>お客様の個人情報を、お客様の同意なく第三者に提供することはありません。ただし、法令に基づく場合はこの限りではありません。</p>
                                </div>

                                <div>
                                    <h3 className="font-bold text-gray-800 mb-2">5. Cookieの使用</h3>
                                    <p>本サービスでは、機能の提供に必要なローカルストレージを使用しています。第三者のトラッキングCookieは使用していません。</p>
                                </div>

                                <div>
                                    <h3 className="font-bold text-gray-800 mb-2">6. データの削除</h3>
                                    <p>ブラウザの設定からローカルストレージを削除することで、いつでもデータを消去できます。</p>
                                </div>

                                <div>
                                    <h3 className="font-bold text-gray-800 mb-2">7. お問い合わせ</h3>
                                    <p>プライバシーに関するご質問は、下記までお問い合わせください。</p>
                                </div>
                            </>
                        ) : (
                            <>
                                <p className="text-xs text-gray-400">Last updated: January 28, 2026</p>

                                <div>
                                    <h3 className="font-bold text-gray-800 mb-2">1. Introduction</h3>
                                    <p>CinderellaFit ("the Service") helps you measure your plushies and find fitting clothes. This Privacy Policy explains how we handle your information.</p>
                                </div>

                                <div>
                                    <h3 className="font-bold text-gray-800 mb-2">2. Information We Collect</h3>
                                    <ul className="list-disc list-inside mt-2 space-y-1">
                                        <li><strong>Plushie data</strong>: Names, types, photos, measurements</li>
                                        <li><strong>Closet data</strong>: Clothing photos, fit ratings, comments</li>
                                        <li><strong>Usage data</strong>: Anonymous app usage statistics</li>
                                    </ul>
                                </div>

                                <div>
                                    <h3 className="font-bold text-gray-800 mb-2">3. Data Storage</h3>
                                    <p>All data is stored locally on your device (browser's local storage). No data is sent to our servers.</p>
                                </div>

                                <div>
                                    <h3 className="font-bold text-gray-800 mb-2">4. Third-Party Sharing</h3>
                                    <p>We do not share your personal information with third parties without your consent, except as required by law.</p>
                                </div>

                                <div>
                                    <h3 className="font-bold text-gray-800 mb-2">5. Cookies</h3>
                                    <p>We use local storage for functionality. We do not use third-party tracking cookies.</p>
                                </div>

                                <div>
                                    <h3 className="font-bold text-gray-800 mb-2">6. Data Deletion</h3>
                                    <p>You can delete your data at any time by clearing your browser's local storage.</p>
                                </div>

                                <div>
                                    <h3 className="font-bold text-gray-800 mb-2">7. Contact</h3>
                                    <p>For privacy questions, please contact us below.</p>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Terms of Service Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-4 overflow-hidden">
                <button
                    onClick={() => toggleSection('terms')}
                    className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-secondary/30 flex items-center justify-center">
                            <FileText size={20} className="text-orange-600" />
                        </div>
                        <span className="font-bold">
                            {language === 'jp' ? '利用規約' : 'Terms of Service'}
                        </span>
                    </div>
                    {expandedSection === 'terms' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>

                {expandedSection === 'terms' && (
                    <div className="px-4 pb-4 text-sm text-gray-600 space-y-4 border-t border-gray-100 pt-4">
                        {language === 'jp' ? (
                            <>
                                <p className="text-xs text-gray-400">最終更新日: 2026年1月28日</p>

                                <div>
                                    <h3 className="font-bold text-gray-800 mb-2">1. サービスの概要</h3>
                                    <p>CinderellaFitは、ぬいぐるみのサイズ計測、お洋服のフィッティング確認、およびクローゼット管理機能を提供する無料サービスです。</p>
                                </div>

                                <div>
                                    <h3 className="font-bold text-gray-800 mb-2">2. 利用条件</h3>
                                    <ul className="list-disc list-inside mt-2 space-y-1">
                                        <li>本サービスは個人利用を目的としています</li>
                                        <li>不正な目的での使用は禁止されています</li>
                                        <li>他者の権利を侵害するコンテンツのアップロードは禁止されています</li>
                                    </ul>
                                </div>

                                <div>
                                    <h3 className="font-bold text-gray-800 mb-2">3. 免責事項</h3>
                                    <ul className="list-disc list-inside mt-2 space-y-1">
                                        <li>本サービスで提供されるサイズ情報は参考値です。実際のフィッティングは商品によって異なる場合があります</li>
                                        <li>外部ショップでの購入に関するトラブルについて、当サービスは責任を負いません</li>
                                        <li>データの損失について、当サービスは責任を負いません。重要なデータはバックアップをお勧めします</li>
                                    </ul>
                                </div>

                                <div>
                                    <h3 className="font-bold text-gray-800 mb-2">4. 著作権</h3>
                                    <p>本サービスのデザイン、ロゴ、コンテンツの著作権は運営者に帰属します。ユーザーがアップロードした画像の著作権はユーザーに帰属します。</p>
                                </div>

                                <div>
                                    <h3 className="font-bold text-gray-800 mb-2">5. サービスの変更・終了</h3>
                                    <p>運営者は、事前の通知なくサービスの内容を変更、または終了する場合があります。</p>
                                </div>

                                <div>
                                    <h3 className="font-bold text-gray-800 mb-2">6. 準拠法</h3>
                                    <p>本規約は日本法に準拠し、解釈されます。</p>
                                </div>
                            </>
                        ) : (
                            <>
                                <p className="text-xs text-gray-400">Last updated: January 28, 2026</p>

                                <div>
                                    <h3 className="font-bold text-gray-800 mb-2">1. Service Overview</h3>
                                    <p>CinderellaFit is a free service for measuring plushies, checking clothing fit, and managing your closet.</p>
                                </div>

                                <div>
                                    <h3 className="font-bold text-gray-800 mb-2">2. Terms of Use</h3>
                                    <ul className="list-disc list-inside mt-2 space-y-1">
                                        <li>This service is for personal use</li>
                                        <li>Unauthorized or illegal use is prohibited</li>
                                        <li>Uploading content that violates others' rights is prohibited</li>
                                    </ul>
                                </div>

                                <div>
                                    <h3 className="font-bold text-gray-800 mb-2">3. Disclaimer</h3>
                                    <ul className="list-disc list-inside mt-2 space-y-1">
                                        <li>Size information is for reference only. Actual fit may vary by product</li>
                                        <li>We are not responsible for issues with external shop purchases</li>
                                        <li>We are not responsible for data loss. Please back up important data</li>
                                    </ul>
                                </div>

                                <div>
                                    <h3 className="font-bold text-gray-800 mb-2">4. Copyright</h3>
                                    <p>Service design and content are owned by the operator. User-uploaded images remain the user's property.</p>
                                </div>

                                <div>
                                    <h3 className="font-bold text-gray-800 mb-2">5. Service Changes</h3>
                                    <p>We may modify or discontinue the service without prior notice.</p>
                                </div>

                                <div>
                                    <h3 className="font-bold text-gray-800 mb-2">6. Governing Law</h3>
                                    <p>These terms are governed by Japanese law.</p>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Contact Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                            <Mail size={20} className="text-green-600" />
                        </div>
                        <span className="font-bold">
                            {language === 'jp' ? 'お問い合わせ' : 'Contact Us'}
                        </span>
                    </div>

                    <p className="text-sm text-gray-600 mb-4">
                        {language === 'jp'
                            ? 'ご質問、ご要望、不具合のご報告などがございましたら、下記メールアドレスまでお気軽にお問い合わせください。'
                            : 'For questions, requests, or bug reports, please contact us at the email below.'}
                    </p>

                    <a
                        href="mailto:theeels@unagi-travel.com"
                        className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-colors"
                    >
                        <Mail size={18} />
                        theeels@unagi-travel.com
                    </a>
                </div>
            </div>

            {/* Version Info */}
            <div className="text-center mt-6 text-xs text-gray-400">
                <p>CinderellaFit v1.0.0</p>
                <p className="mt-1">© 2026 Unagi Travel</p>
            </div>
        </div>
    );
};

export default Legal;
