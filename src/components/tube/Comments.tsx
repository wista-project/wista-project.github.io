import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getVideoComments, Comment } from '@/lib/invidious';
import { useLanguage } from '@/contexts/LanguageContext';
import { Skeleton } from '@/components/ui/skeleton';
import { ThumbsUp, MessageSquare } from 'lucide-react';

interface CommentsProps {
  videoId: string;
}

const CommentItem: React.FC<{ comment: Comment }> = ({ comment }) => (
  <div className="flex gap-3 py-3 border-b">
    <div className="flex-shrink-0">
      {comment.authorThumbnails?.[0]?.url ? (
        <img src={comment.authorThumbnails[0].url} alt={comment.author} className="w-10 h-10 rounded-full object-cover" />
      ) : (
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
          <span className="text-xs">{comment.author.charAt(0)}</span>
        </div>
      )}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-1">
        <span className="font-medium text-sm">{comment.author}</span>
        <span className="text-xs text-muted-foreground">{comment.publishedText}</span>
      </div>
      <p className="text-sm whitespace-pre-wrap break-words">{comment.content}</p>
      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" />{comment.likeCount}</span>
        {comment.replies?.replyCount && comment.replies.replyCount > 0 && (
          <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{comment.replies.replyCount}</span>
        )}
      </div>
    </div>
  </div>
);

const Comments: React.FC<CommentsProps> = ({ videoId }) => {
  const { t } = useLanguage();
  const { data, isLoading, error } = useQuery({
    queryKey: ['comments', videoId],
    queryFn: () => getVideoComments(videoId),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  if (isLoading) return <div className="mt-6"><h3 className="text-lg font-semibold mb-4">{t('comments')}</h3><Skeleton className="h-20 w-full" /></div>;
  if (error) return <div className="mt-6"><h3 className="text-lg font-semibold mb-4">{t('comments')}</h3><p className="text-muted-foreground text-center py-8">{t('failedToLoad')}</p></div>;
  if (!data?.comments?.length) return <div className="mt-6"><h3 className="text-lg font-semibold mb-4">{t('comments')}</h3><p className="text-muted-foreground text-center py-8">{t('noComments')}</p></div>;

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-4">{t('comments')}</h3>
      <div className="space-y-0">{data.comments.map((comment, i) => <CommentItem key={i} comment={comment} />)}</div>
    </div>
  );
};

export default Comments;
