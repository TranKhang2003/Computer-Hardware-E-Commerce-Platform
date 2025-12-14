import { useState, useEffect, useCallback, useRef } from 'react';
import { MessageSquare, Send, Reply, Edit2, Trash2, MoreVertical, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import io from 'socket.io-client';
import { commentAPI } from '@/services/api';

export default function ProductCommentsWebSocket({ productId, currentUser }) {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [replyingTo, setReplyingTo] = useState(null);
    const [replyText, setReplyText] = useState('');
       const [editingComment, setEditingComment] = useState(null);
    const [editText, setEditText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [onlineCount, setOnlineCount] = useState(0);
    const [typingUsers, setTypingUsers] = useState(new Map());
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [commentToDelete, setCommentToDelete] = useState(null);

    const socketRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    // ======================= INIT SOCKET ==========================
    useEffect(() => {
        const SOCKET_URL = import.meta.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

        socketRef.current = io(SOCKET_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5,
        });

        const socket = socketRef.current;

        socket.on('connect', () => {
            console.log('Socket connected:', socket.id);
            socket.emit('join-product', productId);
        });

        socket.on('disconnect', () => {
            console.log('Socket disconnected');
        });

        socket.on('connect_error', (err) => {
            console.error('Socket error:', err);
            toast.error('Connection lost. Trying to reconnect...');
        });

        // New comment
        socket.on('comment-created', ({ comment }) => {
            setComments((prev) => {
                if (prev.some((c) => c._id === comment._id)) return prev;
                return [comment, ...prev];
            });

            if (comment.userId?._id !== currentUser?._id) {
                toast.success(`New comment from ${comment.authorName}`);
            }
        });

        // Updated
        socket.on('comment-updated', ({ comment }) => {
            setComments((prev) =>
                prev.map((c) => (c._id === comment._id ? comment : c)),
            );
        });

        // Deleted
        socket.on('comment-deleted', ({ deletedIds }) => {
            setComments((prev) => prev.filter((c) => !deletedIds.includes(c._id)));
        });

        // Online count
        socket.on('online-count', (count) => {
            setOnlineCount(count);
        });

        // Typing indicators
        socket.on('user-typing', ({ socketId, userName }) => {
            setTypingUsers((prev) => {
                const updated = new Map(prev);
                updated.set(socketId, userName);
                return updated;
            });
        });

        socket.on('user-stopped-typing', ({ socketId }) => {
            setTypingUsers((prev) => {
                const updated = new Map(prev);
                updated.delete(socketId);
                return updated;
            });
        });

        // Cleanup
        return () => {
            if (socket) {
                socket.emit('leave-product', productId);
                socket.disconnect();
            }
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        };
    }, [productId, currentUser]);

    // ======================= FETCH COMMENTS ==========================
    const fetchComments = useCallback(async () => {
        try {
            const response = await commentAPI.getByProduct(productId);
            if (response?.data?.data) setComments(response.data.data);
        } catch (err) {
            console.error('Fetch comments error:', err);
            toast.error('Failed to load comments');
        } finally {
            setLoading(false);
        }
    }, [productId]);

    useEffect(() => {
        fetchComments();
    }, [fetchComments]);

    // ======================= TYPING ==========================
    const handleTyping = () => {
        if (!currentUser) return;
        const socket = socketRef.current;
        if (!socket) return;

        socket.emit('typing-start', {
            productId,
            userName: currentUser.fullName || 'Anonymous',
        });

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        typingTimeoutRef.current = setTimeout(() => {
            socket.emit('typing-stop', { productId });
        }, 2000);
    };

    // ======================= SUBMIT COMMENT ==========================
    const handleSubmitComment = async () => {
        if (!newComment.trim()) return toast.error('Please write a comment');
        if (newComment.trim().length < 5)
            return toast.error('Comment must be at least 5 characters');

        setIsSubmitting(true);

        try {
            const res = await commentAPI.create(productId, {
                comment: newComment.trim(),
                authorName: currentUser?.fullName || 'Guest',
                authorEmail: currentUser?.email || null,
            });

            if (res.data) {
                setNewComment('');
            } else toast.error('Failed to post comment');
        } catch {
            toast.error('Failed to post comment');
        }

        setIsSubmitting(false);
        socketRef.current?.emit('typing-stop', { productId });
    };

    // ======================= REPLY ==========================
    const handleSubmitReply = async (parentId) => {
        if (!replyText.trim() || replyText.trim().length < 5) {
            return toast.error('Reply must be at least 5 characters');
        }

        setIsSubmitting(true);

        try {
            const res = await commentAPI.create(productId, {
                comment: replyText.trim(),
                parentId,
                authorName: currentUser?.fullName || 'Guest',
                authorEmail: currentUser?.email || null,
            });

            if (res.data) {
                setReplyingTo(null);
                setReplyText('');
            } else toast.error('Failed to post reply');
        } catch {
            toast.error('Failed to post reply');
        }

        setIsSubmitting(false);
    };

    // ======================= EDIT ==========================
    const handleEditComment = async (commentId) => {
        if (!editText.trim() || editText.trim().length < 5) {
            return toast.error('Comment must be at least 5 characters');
        }

        setIsSubmitting(true);

        try {
            const res = await commentAPI.update(productId, commentId, {
                comment: editText.trim(),
            });

            if (res.data) {
                setEditingComment(null);
                setEditText('');
            } else toast.error('Failed to update comment');
        } catch {
            toast.error('Failed to update comment');
        }

        setIsSubmitting(false);
    };

    // ======================= MAKE TREE ==========================
    const organizeComments = (list) => {
        const map = {};
        const roots = [];

        list.forEach((c) => (map[c._id] = { ...c, replies: [] }));

        list.forEach((c) => {
            if (c.parentId && map[c.parentId]) {
                map[c.parentId].replies.push(map[c._id]);
            } else {
                roots.push(map[c._id]);
            }
        });

        return roots;
    };

    const organizedComments = organizeComments(comments);

    // ======================= RENDER COMMENT ==========================
    const renderComment = (comment, isReply = false) => {
        const isOwner = currentUser?.email === comment.authorEmail;
        const isEditing = editingComment === comment._id;
        const isReplying = replyingTo === comment._id;

        return (
            <div key={comment._id} className={isReply ? 'ml-12 mt-3' : 'mb-4'}>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={comment.userId?.avatarUrl} />
                                <AvatarFallback>
                                    {comment.authorName?.[0]?.toUpperCase() || 'U'}
                                </AvatarFallback>
                            </Avatar>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <p className="font-medium">{comment.authorName}</p>
                                        {comment.isEdited && (
                                            <Badge variant="outline" className="text-xs">
                                                Edited
                                            </Badge>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(comment.createdAt).toLocaleString()}
                                        </span>

                                        {isOwner && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>

                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem
                                                        onClick={() => {
                                                            setEditingComment(comment._id);
                                                            setEditText(comment.comment);
                                                        }}
                                                    >
                                                        <Edit2 className="mr-2 h-4 w-4" />
                                                        Edit
                                                    </DropdownMenuItem>

                                                    <DropdownMenuItem
                                                        className="text-destructive"
                                                        onClick={() => {
                                                            setCommentToDelete(comment._id);
                                                            setIsDeleteDialogOpen(true);
                                                        }}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </div>
                                </div>

                                {isEditing ? (
                                    <div className="space-y-2">
                                        <Textarea
                                            value={editText}
                                            onChange={(e) => setEditText(e.target.value)}
                                            rows={3}
                                            disabled={isSubmitting}
                                        />

                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                onClick={() => handleEditComment(comment._id)}
                                                disabled={isSubmitting}
                                            >
                                                Save
                                            </Button>

                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    setEditingComment(null);
                                                    setEditText('');
                                                }}
                                                disabled={isSubmitting}
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-sm text-muted-foreground whitespace-pre-line mb-2">
                                            {comment.comment}
                                        </p>

                                        {!isReply && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 px-2 text-xs"
                                                onClick={() => setReplyingTo(comment._id)}
                                            >
                                                <Reply className="mr-1 h-3 w-3" />
                                                Reply
                                            </Button>
                                        )}
                                    </>
                                )}

                                {isReplying && (
                                    <div className="mt-3 space-y-2">
                                        <Textarea
                                            value={replyText}
                                            onChange={(e) => setReplyText(e.target.value)}
                                            rows={2}
                                            placeholder="Write a reply..."
                                        />

                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                onClick={() => handleSubmitReply(comment._id)}
                                                disabled={isSubmitting}
                                            >
                                                <Send className="mr-1 h-3 w-3" />
                                                Reply
                                            </Button>

                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    setReplyingTo(null);
                                                    setReplyText('');
                                                }}
                                                disabled={isSubmitting}
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {comment.replies?.length > 0 && (
                    <div className="mt-3 space-y-3">
                        {comment.replies.map((reply) => renderComment(reply, true))}
                    </div>
                )}
            </div>
        );
    };

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        Comments
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-muted-foreground">Loading comments...</div>
                </CardContent>
            </Card>
        );
    }

    const typingUsersArray = Array.from(typingUsers.values());

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        Comments ({comments.length})
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{onlineCount} online</span>
                    </div>
                </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* NEW COMMENT */}
                <div className="space-y-3">
                    <Textarea
                        value={newComment}
                        onChange={(e) => {
                            setNewComment(e.target.value);
                            handleTyping();
                        }}
                        placeholder={
                            currentUser
                                ? 'Share your thoughts about this product...'
                                : 'Write a comment...'
                        }
                        rows={3}
                        disabled={isSubmitting}
                        maxLength={1000}
                    />

                    <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">{newComment.length}/1000</p>

                        <Button onClick={handleSubmitComment} disabled={isSubmitting}>
                            <Send className="mr-2 h-4 w-4" />
                            {isSubmitting ? 'Posting...' : 'Post Comment'}
                        </Button>
                    </div>

                    {typingUsersArray.length > 0 && (
                        <p className="text-xs text-muted-foreground italic">
                            {typingUsersArray.join(', ')}{' '}
                            {typingUsersArray.length === 1 ? 'is typing...' : 'are typing...'}
                        </p>
                    )}
                </div>

                {/* COMMENTS */}
                {organizedComments.length > 0 ? (
                    <div className="space-y-4">
                        {organizedComments.map((comment) => renderComment(comment))}
                    </div>
                ) : (
                    <div className="text-center py-12 text-muted-foreground">
                        <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        No comments yet. Be the first to comment!
                    </div>
                )}
            </CardContent>

            {/* DELETE DIALOG */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Comment?</DialogTitle>
                    </DialogHeader>

                    <p>Are you sure you want to delete this comment? This action cannot be undone.</p>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                            Cancel
                        </Button>

                        <Button
                            variant="destructive"
                            onClick={async () => {
                                if (!commentToDelete) return;

                                try {
                                    await commentAPI.delete(productId, commentToDelete);
                                    toast.success('Comment deleted');
                                } catch {
                                    toast.error('Failed to delete comment');
                                }

                                setIsDeleteDialogOpen(false);
                                setCommentToDelete(null);
                            }}
                        >
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
