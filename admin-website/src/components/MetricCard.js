import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const MetricCard = ({ 
  title, 
  value, 
  total, 
  icon: Icon, 
  color, 
  bgColor, 
  change, 
  changeType 
}) => {
  return (
    <div className="bg-white rounded-[22px] border border-gray-200 p-6 
                  shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]
                  hover:shadow-[0_4px_12px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.04)]
                  hover:border-primary-500 transition-all duration-200">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
            {title}
          </p>
          <div className="flex items-baseline mb-3">
            <p className="text-3xl font-bold text-gray-900 leading-tight">
              {value}
            </p>
            {total && (
              <p className="ml-2 text-base text-gray-400 font-medium">/ {total}</p>
            )}
          </div>
          {change && (
            <div className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${
              changeType === 'positive' 
                ? 'bg-green-100 text-green-700' 
                : 'bg-red-100 text-red-700'
            }`}>
              {changeType === 'positive' ? (
                <TrendingUp className="w-3 h-3 mr-1" />
              ) : (
                <TrendingDown className="w-3 h-3 mr-1" />
              )}
              {change}
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl ${bgColor} shadow-sm flex-shrink-0 ml-4`}>
          <Icon className={`w-7 h-7 ${color}`} />
        </div>
      </div>
    </div>
  );
};

export default MetricCard;
