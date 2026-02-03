import React from 'react';
import { motion } from 'framer-motion';

export const TrustScore: React.FC<{ score: number, size?: 'sm' | 'md' | 'lg' }> = ({ score, size = 'md' }) => {
    const radius = size === 'sm' ? 20 : size === 'md' ? 40 : 60;
    const stroke = size === 'sm' ? 3 : size === 'md' ? 6 : 8;
    const normalizedRadius = radius - stroke * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    let color = '#ec4899'; // Pink (Low)
    if (score > 50) color = '#eab308'; // Yellow (Medium)
    if (score > 80) color = '#10b981'; // Emerald (High)

    return (
        <div className="relative flex items-center justify-center font-mono">
            <svg
                height={radius * 2}
                width={radius * 2}
                className="transform -rotate-90"
            >
                <circle
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth={stroke}
                    fill="transparent"
                    r={normalizedRadius}
                    cx={radius}
                    cy={radius}
                />
                <motion.circle
                    stroke={color}
                    strokeWidth={stroke}
                    strokeDasharray={circumference + ' ' + circumference}
                    style={{ strokeDashoffset }}
                    strokeLinecap="round"
                    fill="transparent"
                    r={normalizedRadius}
                    cx={radius}
                    cy={radius}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                />
            </svg>
            <div className={`absolute text-white font-bold ${size === 'sm' ? 'text-xs' : size === 'md' ? 'text-xl' : 'text-3xl'}`}>
                {score}
            </div>
        </div>
    );
};
