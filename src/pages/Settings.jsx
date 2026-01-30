import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Upload, Globe, Crown, FileJson, AlertCircle, CheckCircle, Shield, User, LogOut, LogIn } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

const Settings = () => {
    const navigate = useNavigate();
    const { plushies, closetItems, language, toggleLanguage, t, userPlan, plushieLimit } = useApp();
    const { currentUser, logout } = useAuth();
    const [importStatus, setImportStatus] = useState(null);
    const [showImportModal, setShowImportModal] = useState(false);
    const [importText, setImportText] = useState('');

    const handleLogout = async () => {
        const result = await logout();
        if (result.success) {
            navigate('/login');
        } else {
            setImportStatus({
                success: false,
                message: language === 'jp' ? 'ログアウトに失敗しました' : 'Logout failed'
            });
        }
    };

    // Export all data as JSON
    const handleExport = () => {
        const exportData = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            plushies,
            closetItems,
            settings: {
                language,
                userPlan
            }
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `cinderellafit-backup-${new Date().toISOString().split('T')[0]}.json`;
        link.click();

        URL.revokeObjectURL(url);

        setImportStatus({
            success: true,
            message: language === 'jp'
                ? 'データをエクスポートしました'
                : 'Data exported successfully'
        });
    };

    // Process import data
    const processImportData = (dataString) => {
        try {
            const importData = JSON.parse(dataString);

            // Validate data structure
            if (!importData.plushies || !importData.closetItems) {
                throw new Error('Invalid data format');
            }

            // Save to localStorage
            localStorage.setItem('my_plushies_v2', JSON.stringify(importData.plushies));
            localStorage.setItem('my_closet_v1', JSON.stringify(importData.closetItems));

            if (importData.settings) {
                if (importData.settings.language) {
                    localStorage.setItem('app_language', importData.settings.language);
                }
            }

            setImportStatus({
                success: true,
                message: language === 'jp'
                    ? 'データのインポートに成功しました！ページを再読み込みします...'
                    : 'Data imported successfully! Reloading page...'
            });

            // Reload page to reflect changes
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } catch (error) {
            console.error('Import error:', error);
            setImportStatus({
                success: false,
                message: language === 'jp'
                    ? `エラー: ${error.message || 'データのインポートに失敗しました'}`
                    : `Error: ${error.message || 'Failed to import data'}`
            });
        }
    };

    // Import data from file
    const handleFileImport = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            processImportData(e.target.result);
        };
        reader.onerror = () => {
            setImportStatus({
                success: false,
                message: language === 'jp'
                    ? 'ファイルの読み込みに失敗しました'
                    : 'Failed to read file'
            });
        };
        reader.readAsText(file);
    };

    // Import data from text paste
    const handleTextImport = () => {
        if (!importText.trim()) {
            setImportStatus({
                success: false,
                message: language === 'jp'
                    ? 'データを貼り付けてください'
                    : 'Please paste data'
            });
            return;
        }
        processImportData(importText);
        setShowImportModal(false);
        setImportText('');
    };

    const getPlanBadgeColor = () => {
        switch (userPlan) {
            case 'premium': return 'bg-gradient-to-r from-purple-500 to-pink-500';
            case 'enterprise': return 'bg-gradient-to-r from-gray-700 to-gray-900';
            default: return 'bg-gray-400';
        }
    };

    const getPlanName = () => {
        if (language === 'jp') {
            switch (userPlan) {
                case 'premium': return 'プレミアム';
                case 'enterprise': return 'エンタープライズ';
                default: return '無料プラン';
            }
        } else {
            switch (userPlan) {
                case 'premium': return 'Premium';
                case 'enterprise': return 'Enterprise';
                default: return 'Free Plan';
            }
        }
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
                    {language === 'jp' ? '設定' : 'Settings'}
                </h1>
            </div>

            {/* Plan Info */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Crown size={20} className="text-yellow-500" />
                        <span className="font-bold text-gray-700">
                            {language === 'jp' ? 'プラン' : 'Plan'}
                        </span>
                    </div>
                    <div className={`${getPlanBadgeColor()} text-white px-3 py-1 rounded-full text-xs font-bold`}>
                        {getPlanName()}
                    </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                        {language === 'jp' ? 'ぬいぐるみ登録数' : 'Plushies'}
                    </span>
                    <span className="font-bold text-gray-700">
                        {plushies.length} / {plushieLimit === Infinity ? '∞' : plushieLimit}
                    </span>
                </div>
            </div>

            {/* User Authentication */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-4 overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <User size={20} className="text-primary" />
                        <span className="font-bold">
                            {language === 'jp' ? 'アカウント' : 'Account'}
                        </span>
                    </div>
                </div>

                {currentUser ? (
                    // Logged In State
                    <>
                        <div className="p-4 border-b border-gray-100">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                    <User size={20} className="text-primary" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-sm text-gray-700">
                                        {currentUser.displayName || (language === 'jp' ? 'ユーザー' : 'User')}
                                    </p>
                                    <p className="text-xs text-gray-500">{currentUser.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                <div className="px-2 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-bold">
                                    {language === 'jp' ? 'ログイン中' : 'Logged In'}
                                </div>
                                {currentUser.emailVerified && (
                                    <div className="px-2 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold">
                                        ✓ {language === 'jp' ? '認証済み' : 'Verified'}
                                    </div>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                                    <LogOut size={20} className="text-red-600" />
                                </div>
                                <span className="font-bold text-sm text-red-600">
                                    {language === 'jp' ? 'ログアウト' : 'Logout'}
                                </span>
                            </div>
                        </button>
                    </>
                ) : (
                    // Not Logged In State
                    <button
                        onClick={() => navigate('/login')}
                        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <LogIn size={20} className="text-primary" />
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-sm">
                                    {language === 'jp' ? 'ログイン' : 'Login'}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {language === 'jp' ? 'データを同期' : 'Sync your data'}
                                </p>
                            </div>
                        </div>
                        <ArrowLeft size={16} className="rotate-180 text-gray-400" />
                    </button>
                )}
            </div>

            {/* Data Management */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-4 overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <FileJson size={20} className="text-primary" />
                        <span className="font-bold">
                            {language === 'jp' ? 'データ管理' : 'Data Management'}
                        </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                        {language === 'jp'
                            ? 'デバイス間でデータを移行できます'
                            : 'Transfer data between devices'}
                    </p>
                </div>

                {/* Export */}
                <button
                    onClick={handleExport}
                    className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-100"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                            <Download size={20} className="text-blue-600" />
                        </div>
                        <div className="text-left">
                            <p className="font-bold text-sm">
                                {language === 'jp' ? 'データをエクスポート' : 'Export Data'}
                            </p>
                            <p className="text-xs text-gray-500">
                                {language === 'jp' ? 'JSONファイルとして保存' : 'Save as JSON file'}
                            </p>
                        </div>
                    </div>
                </button>

                {/* Import from File */}
                <label className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                            <Upload size={20} className="text-green-600" />
                        </div>
                        <div className="text-left">
                            <p className="font-bold text-sm">
                                {language === 'jp' ? 'ファイルから' : 'From File'}
                            </p>
                            <p className="text-xs text-gray-500">
                                {language === 'jp' ? 'JSONファイルを選択' : 'Select JSON file'}
                            </p>
                        </div>
                    </div>
                    <input
                        type="file"
                        accept=".json,application/json"
                        onChange={handleFileImport}
                        className="hidden"
                    />
                </label>

                {/* Import from Text Paste */}
                <button
                    onClick={() => setShowImportModal(true)}
                    className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center">
                            <FileJson size={20} className="text-purple-600" />
                        </div>
                        <div className="text-left">
                            <p className="font-bold text-sm">
                                {language === 'jp' ? 'テキストから' : 'From Text'}
                            </p>
                            <p className="text-xs text-gray-500">
                                {language === 'jp' ? 'JSONを貼り付け（推奨）' : 'Paste JSON (Recommended)'}
                            </p>
                        </div>
                    </div>
                </button>
            </div>

            {/* Text Import Modal */}
            {
                showImportModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowImportModal(false)}>
                        <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                            <h3 className="font-bold text-lg mb-2">
                                {language === 'jp' ? 'データをインポート' : 'Import Data'}
                            </h3>
                            <p className="text-xs text-gray-500 mb-4">
                                {language === 'jp'
                                    ? 'エクスポートしたJSONデータを下のエリアに貼り付けてください'
                                    : 'Paste your exported JSON data below'}
                            </p>
                            <textarea
                                value={importText}
                                onChange={(e) => setImportText(e.target.value)}
                                className="w-full h-40 p-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-xs font-mono"
                                placeholder='{"version":"1.0", "plushies":[...]...}'
                            />
                            <div className="flex gap-2 mt-4">
                                <button
                                    onClick={() => {
                                        setShowImportModal(false);
                                        setImportText('');
                                    }}
                                    className="flex-1 py-3 rounded-xl bg-gray-100 font-bold text-gray-600 hover:bg-gray-200 transition-colors"
                                >
                                    {language === 'jp' ? 'キャンセル' : 'Cancel'}
                                </button>
                                <button
                                    onClick={handleTextImport}
                                    className="flex-1 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary-dark transition-colors"
                                >
                                    {language === 'jp' ? 'インポート' : 'Import'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Import Status Message */}
            {
                importStatus && (
                    <div className={`flex items-center gap-2 p-3 rounded-xl mb-4 ${importStatus.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {importStatus.success ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                        <span className="text-sm font-medium">{importStatus.message}</span>
                    </div>
                )
            }

            {/* Language */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-4 overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <Globe size={20} className="text-primary" />
                        <span className="font-bold">
                            {language === 'jp' ? '言語' : 'Language'}
                        </span>
                    </div>
                </div>
                <button
                    onClick={toggleLanguage}
                    className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                    <span className="text-sm font-medium">
                        {language === 'jp' ? '日本語' : 'English'}
                    </span>
                    <div className="flex gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${language === 'jp' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'}`}>
                            日本語
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${language === 'en' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'}`}>
                            English
                        </span>
                    </div>
                </button>
            </div>

            {/* Legal */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <button
                    onClick={() => navigate('/legal')}
                    className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                            <Shield size={20} className="text-gray-600" />
                        </div>
                        <span className="font-bold text-sm">
                            {language === 'jp' ? 'プライバシーポリシー・利用規約' : 'Privacy Policy & Terms'}
                        </span>
                    </div>
                    <ArrowLeft size={16} className="rotate-180 text-gray-400" />
                </button>
            </div>

            {/* App Version */}
            <div className="text-center mt-6 text-xs text-gray-400">
                <p>CinderellaFit v1.0.0</p>
                <p className="mt-1">© 2026 Unagi Travel</p>
            </div>
        </div >
    );
};

export default Settings;
