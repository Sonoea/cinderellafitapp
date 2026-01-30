import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, useTexture, Cylinder, Cone, Sphere } from '@react-three/drei';
import * as THREE from 'three';

const BodyModel = ({ measurements, image }) => {
    // Basic Shape Construction based on measurements
    // 1 unit = 1 cm
    const height = measurements.height || 20;
    const waist = measurements.waist || 15;
    const waistRadius = waist / (2 * Math.PI);

    const headSize = measurements.head ? measurements.head / Math.PI : waistRadius * 1.5; // Approx

    // Create a texture from the user image? 
    // It's hard to map a flat image to a cylinder nicely without knowing UVs, 
    // but we can try to display it as a sprite or just use colors for the shape.
    // Let's use the image on a plane (Billboard) inside the body for reference.

    return (
        <group position={[0, -height / 2, 0]}>
            {/* Body Cylinder */}
            <Cylinder args={[waistRadius, waistRadius, height * 0.6, 32]} position={[0, height * 0.3, 0]}>
                <meshStandardMaterial color="#f0f0f0" transparent opacity={0.8} />
            </Cylinder>

            {/* Head */}
            <Sphere args={[headSize / 2, 32, 32]} position={[0, height * 0.3 + (height * 0.3) + (headSize / 2) - 1, 0]}>
                <meshStandardMaterial color="#ffd1dc" />
            </Sphere>

            {/* Arms (Simplistic) - if measurements exist */}
            {measurements.arm > 0 && (
                <>
                    <Cylinder args={[0.5, 0.5, measurements.arm, 16]} position={[waistRadius + 0.5, height * 0.5, 0]} rotation={[0, 0, -Math.PI / 4]}>
                        <meshStandardMaterial color="#f0f0f0" />
                    </Cylinder>
                    <Cylinder args={[0.5, 0.5, measurements.arm, 16]} position={[-waistRadius - 0.5, height * 0.5, 0]} rotation={[0, 0, Math.PI / 4]}>
                        <meshStandardMaterial color="#f0f0f0" />
                    </Cylinder>
                </>
            )}

            {/* 2D Image Billboard for Visual Ref */}
            <Html position={[0, height + 2, 0]} center>
                <div className="bg-white/80 p-1 px-2 rounded-full text-[10px] font-bold whitespace-nowrap shadow-sm backdrop-blur-sm">
                    3D Body Model
                </div>
            </Html>
        </group>
    );
};

const ClothingModel = ({ width, length, bodyWaist }) => {
    if (!width || !length) return null;

    const clothingCircumference = width * 2;
    const clothingRadius = clothingCircumference / (2 * Math.PI);

    const bodyCircumference = bodyWaist;
    const bodyRadius = bodyCircumference / (2 * Math.PI);

    // Color logic
    let color = "#4ade80"; // Green (Good)
    if (clothingCircumference < bodyCircumference) color = "#ef4444"; // Red (Too small)
    else if (clothingCircumference > bodyCircumference + 10) color = "#60a5fa"; // Blue (Loose)

    return (
        <group position={[0, -length / 2 + (length / 2), 0]}> {/* Centered vertically somewhat relative to fit */}
            {/* We position the clothes around the 'torso' */}
            <Cylinder args={[clothingRadius, clothingRadius, length, 32]} position={[0, 0, 0]}>
                <meshStandardMaterial color={color} transparent opacity={0.4} wireframe={false} side={THREE.DoubleSide} />
            </Cylinder>
            {/* Wireframe overlay for clarity */}
            <Cylinder args={[clothingRadius + 0.05, clothingRadius + 0.05, length, 32]} position={[0, 0, 0]}>
                <meshBasicMaterial color={color} wireframe opacity={0.6} transparent />
            </Cylinder>

            <Html position={[clothingRadius + 2, 0, 0]}>
                <div className="bg-black/70 text-white p-1 px-2 rounded-md text-[10px] whitespace-nowrap">
                    Size: {clothingCircumference.toFixed(1)}cm
                    <br />
                    (Diff: {(clothingCircumference - bodyCircumference).toFixed(1)}cm)
                </div>
            </Html>
        </group>
    );
};

const ThreeDView = ({ plushie, product }) => {
    return (
        <div className="w-full h-full bg-gray-100 rounded-xl overflow-hidden relative">
            <Canvas camera={{ position: [0, 10, 30], fov: 45 }}>
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} />
                <OrbitControls makeDefault />

                <group position={[0, -5, 0]}>
                    <BodyModel measurements={plushie.measurements} image={plushie.image} />

                    {/* Position clothing around the torso area roughly */}
                    <group position={[0, (plushie.measurements.height * 0.3), 0]}>
                        <ClothingModel
                            width={product.width}
                            length={product.length}
                            bodyWaist={plushie.measurements.waist}
                        />
                    </group>

                    <gridHelper args={[50, 50, 0xdddddd, 0xeeeeee]} />
                </group>
            </Canvas>

            <div className="absolute bottom-4 left-4 bg-white/90 p-3 rounded-lg text-xs shadow-sm pointer-events-none">
                <p className="font-bold mb-1">3D Fit Check</p>
                <div className="flex items-center gap-2 mb-1">
                    <span className="w-3 h-3 rounded-full bg-gray-200 block"></span>
                    <span>Body ({plushie.name})</span>
                </div>
                {product.width ? (
                    <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full block border`} style={{
                            backgroundColor: (product.width * 2) < plushie.measurements.waist ? '#ef4444' : (product.width * 2) > plushie.measurements.waist + 10 ? '#60a5fa' : '#4ade80'
                        }}></span>
                        <span>Clothes ({product.name})</span>
                    </div>
                ) : (
                    <span className="text-gray-400">No Item Size Data</span>
                )}
            </div>
        </div>
    );
};

export default ThreeDView;
