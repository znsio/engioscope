/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/interactive-supports-focus */
import React from 'react';

type CardTitleProps = {
  title: string;
  titleUrl?: string;
  subtitle: React.ReactNode | undefined;
};

const CardTitle: React.FC<CardTitleProps> = ({ title, subtitle, titleUrl }) => (
  <div className="flex">
    <span className="text-lg font-bold align-text-bottom">
      {titleUrl ? (
        <a
          href={titleUrl}
          target="_blank"
          rel="noreferrer"
          className="link-text font-bold text-lg truncate max-width-full"
          onClick={e => e.stopPropagation()}
        >
          {title}
        </a>
      ) : title}
    </span>
    <div
      className="text-base ml-2 text-gray-600 font-semibold flex-1 align-text-bottom"
      style={{ lineHeight: '27px' }}
    >
      {subtitle}
    </div>
  </div>
);

export type CardProps = {
  title: string;
  titleUrl?: string;
  subtitle?: React.ReactNode | undefined;
  // TODO: Remove this prop
  preTabs?: React.ReactNode;
  onCardClick?: () => void;
  isExpanded: boolean;
  className?: string;
};

const Card: React.FC<CardProps> = ({
  title, titleUrl, subtitle, children, onCardClick, isExpanded, className
}) => (
  <div
    className={`bg-white ${className} border-l-4 p-6 mb-4 ${isExpanded ? 'border-gray-500' : ''} 
  transition-colors duration-500 ease-in-out rounded-lg shadow relative
  `}
    style={{ contain: 'content' }}
  >
    <div className="grid grid-flow-row mt-2">
      <div
        className="w-full cursor-pointer"
        role="button"
        onClick={onCardClick}
      >
        <div className="grid mx-6">
          <CardTitle
            title={title}
            titleUrl={titleUrl}
            subtitle={subtitle}
          />
        </div>
      </div>
    </div>
    {children}
  </div>
);

export default Card;
