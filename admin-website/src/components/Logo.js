import React from 'react';
import logoIcon from '../assets/logo-icon.svg';
import logoFull from '../assets/logo-full.svg';
import logo from '../assets/logo.svg';

/**
 * Logo component for Navi-GO
 * @param {string} variant - 'icon', 'full', or 'default'
 * @param {string} className - Additional CSS classes
 * @param {number} width - Width of the logo
 * @param {number} height - Height of the logo
 */
const NaviGoLogo = ({ variant = 'default', className = '', width, height }) => {
  const baseClasses = 'inline-block';
  
  let logoSrc;
  let defaultWidth, defaultHeight;
  
  switch (variant) {
    case 'icon':
      logoSrc = logoIcon;
      defaultWidth = 60;
      defaultHeight = 60;
      break;
    case 'full':
      logoSrc = logoFull;
      defaultWidth = 180;
      defaultHeight = 50;
      break;
    default:
      logoSrc = logo;
      defaultWidth = 200;
      defaultHeight = 60;
      break;
  }
  
  return (
    <img 
      src={logoSrc} 
      alt="Navi-GO Logo" 
      className={`${baseClasses} ${className}`}
      width={width || defaultWidth}
      height={height || defaultHeight}
    />
  );
};

export default NaviGoLogo;



