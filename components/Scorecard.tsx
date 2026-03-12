'use client';

import React from 'react';
import type { StockScorecard } from '@/types/stock';
import { getRatingStars, getRatingColor } from '@/lib/calculations';

interface ScorecardProps {
  scorecard: StockScorecard;
}

export default function Scorecard({ scorecard }: ScorecardProps) {
  const percentage = (scorecard.totalScore / scorecard.maxScore) * 100;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
        <h3 className="text-white font-bold text-lg flex items-center gap-2">
          <span className="text-2xl">🏆</span>
          {scorecard.ticker} — VI Quality Scorecard
        </h3>
        <p className="text-indigo-200 text-xs mt-1">ระบบให้คะแนนคุณภาพหุ้นอัตโนมัติสำหรับนักลงทุน VI</p>
      </div>

      <div className="p-6">
        {/* Main Score Display */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1">
            {/* Circular Progress */}
            <div className="relative w-32 h-32 mx-auto">
              <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                <circle
                  cx="60" cy="60" r="50"
                  fill="none"
                  stroke={
                    scorecard.rating >= 4 ? '#10b981' :
                    scorecard.rating >= 3 ? '#3b82f6' :
                    scorecard.rating >= 2 ? '#f59e0b' : '#ef4444'
                  }
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${percentage * 3.14} 314`}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-extrabold text-slate-800">{scorecard.totalScore}</span>
                <span className="text-xs text-slate-400 font-medium">/ {scorecard.maxScore}</span>
              </div>
            </div>
          </div>

          <div className="flex-1 text-center">
            <div className="text-3xl mb-1">{getRatingStars(scorecard.rating)}</div>
            <div className={`inline-block px-4 py-2 rounded-xl text-sm font-bold border ${getRatingColor(scorecard.rating)}`}>
              {scorecard.ratingLabel}
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-2 text-[10px] font-bold uppercase text-slate-400 px-2 mb-1">
            <div className="col-span-1"></div>
            <div className="col-span-4">เกณฑ์</div>
            <div className="col-span-4">รายละเอียด</div>
            <div className="col-span-3 text-right">คะแนน</div>
          </div>
          {scorecard.categories.map((cat, i) => (
            <div 
              key={i} 
              className={`grid grid-cols-12 gap-2 items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                cat.score === cat.maxScore ? 'bg-emerald-50' :
                cat.score > 0 ? 'bg-yellow-50' : 'bg-slate-50'
              }`}
            >
              <div className="col-span-1 text-lg">{cat.icon}</div>
              <div className="col-span-4 font-medium text-slate-700">{cat.name}</div>
              <div className="col-span-4 text-xs text-slate-500">{cat.detail}</div>
              <div className="col-span-3 text-right">
                <span className={`font-bold text-sm ${
                  cat.score === cat.maxScore ? 'text-emerald-600' :
                  cat.score > 0 ? 'text-amber-600' : 'text-slate-400'
                }`}>
                  {cat.score}
                </span>
                <span className="text-slate-400 text-xs">/{cat.maxScore}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
