import React from 'react';
import { VideoRecommendation } from '../types';
import { ExternalLink, Youtube } from 'lucide-react';

interface VideoCardProps {
  video: VideoRecommendation;
  isSelected: boolean;
  onSelect: (video: VideoRecommendation) => void;
}

export const VideoCard: React.FC<VideoCardProps> = ({ video, isSelected, onSelect }) => {
  return (
    <div
      onClick={() => onSelect(video)}
      className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 hover:shadow-md ${
        isSelected
          ? 'border-blue-500 bg-blue-50 shadow-md'
          : 'border-slate-200 bg-white hover:border-blue-300'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold ${
            isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
        }`}>
          {video.id}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-slate-900 line-clamp-2">{video.title}</h3>
          <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
            <Youtube size={14} className="text-red-500"/>
            {video.channel}
          </p>
          {video.description && (
            <p className="mt-2 text-sm text-slate-600 line-clamp-2">{video.description}</p>
          )}
          <a
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="mt-3 inline-flex items-center text-xs font-medium text-blue-600 hover:text-blue-800"
          >
            YouTube에서 보기 <ExternalLink size={12} className="ml-1" />
          </a>
        </div>
      </div>
    </div>
  );
};
