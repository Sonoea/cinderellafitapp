import React from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';

// Split out of Home.jsx into its own tab: managing your own plushies is a
// distinct task from browsing the gallery, and stacking both on Home made
// the page feel cluttered.
const MyPlushies = () => {
    const { plushies, t, plushieLimit, canAddPlushie, userAddedPlushieCount } = useApp();

    return (
        <div className="flex flex-col gap-2">
            <header className="py-2">
                <h1 style={{ color: 'var(--primary-dark)', fontSize: '20px', fontWeight: '800', letterSpacing: '-0.03em' }}>
                    {t('myFriends')}
                </h1>
                <p style={{ fontSize: '10px', color: 'var(--text-light)', marginTop: '2px' }}>
                    {t('plushieCount', userAddedPlushieCount, plushieLimit)}
                    {plushieLimit !== Infinity && (
                        <span style={{ marginLeft: '4px', color: 'var(--secondary)' }}>
                            {t('currentLabel')}
                        </span>
                    )}
                </p>
            </header>

            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
            }} className="plushie-list">
                {plushies.map(plushie => (
                    <div key={plushie.id} className="hover-scale" style={{
                        width: '100%',
                        backgroundColor: 'white',
                        borderRadius: 'var(--radius-md)',
                        padding: '16px',
                        boxShadow: 'var(--shadow-sm)',
                        border: '1px solid var(--gray-200)',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            position: 'absolute',
                            top: '-20px',
                            right: '-20px',
                            width: '100px',
                            height: '100px',
                            borderRadius: '50%',
                            background: `linear-gradient(135deg, ${['Unagi', 'ウナギ'].includes(plushie.type) ? 'var(--secondary-light)' : 'var(--primary-light)'} 0%, ${['Unagi', 'ウナギ'].includes(plushie.type) ? '#F5EDE9' : '#E8F4F5'} 100%)`,
                            opacity: 0.5
                        }}></div>

                        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                            <img
                                src={plushie.image}
                                alt={plushie.name}
                                style={{
                                    width: '100px',
                                    height: '100px',
                                    borderRadius: '12px',
                                    objectFit: 'cover',
                                    objectPosition: 'top center',
                                    flexShrink: 0,
                                    border: '1px solid var(--gray-200)'
                                }}
                            />

                            <div style={{ flex: 1, minWidth: 0 }}>
                                <h3 style={{ fontSize: '17px', fontWeight: '700', marginBottom: '2px', color: 'var(--primary-dark)', letterSpacing: '-0.02em' }}>
                                    {plushie.name}
                                </h3>
                                <p style={{ fontSize: '11px', color: 'var(--text-light)', marginBottom: '12px' }}>{plushie.type}</p>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                    <div>
                                        <p style={{ fontSize: '10px', color: 'var(--text-light)', marginBottom: '2px', fontWeight: '500' }}>{t('height')}</p>
                                        <p style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>{plushie.measurements.height}<span style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-light)' }}>cm</span></p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '10px', color: 'var(--text-light)', marginBottom: '2px', fontWeight: '500' }}>{t('waist')}</p>
                                        <p style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>{plushie.measurements.waist}<span style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-light)' }}>cm</span></p>
                                    </div>
                                </div>
                            </div>

                            <Link
                                to={`/measure?edit=${plushie.id}`}
                                className="absolute top-0 right-0 p-2.5 rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-200 z-20"
                                title={t('editSizeTitle')}
                                style={{
                                    background: 'white',
                                    color: 'var(--primary)',
                                    border: '1px solid var(--gray-200)'
                                }}
                            >
                                <Pencil size={16} strokeWidth={2.5} />
                            </Link>
                        </div>
                    </div>
                ))}

                {canAddPlushie && (
                    <Link to="/measure" style={{
                        display: 'block',
                        width: '100%',
                        backgroundColor: 'white',
                        border: '2px dashed var(--gray-200)',
                        borderRadius: 'var(--radius-md)',
                        padding: '32px',
                        textAlign: 'center',
                        transition: 'all 0.2s ease'
                    }} className="hover-scale">
                        <Plus size={32} style={{ margin: '0 auto 12px', color: 'var(--gray-300)' }} />
                        <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--gray-400)' }}>
                            {t('addNew')}
                        </p>
                    </Link>
                )}
            </div>
        </div>
    );
};

export default MyPlushies;
