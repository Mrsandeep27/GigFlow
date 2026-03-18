-- =============================================
-- Migration 003: Missing indexes & constraints
-- =============================================

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_gigs_created_by ON gigs(created_by);
CREATE INDEX IF NOT EXISTS idx_gigs_status ON gigs(status);
CREATE INDEX IF NOT EXISTS idx_gigs_created_at ON gigs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bids_gig_bidder ON bids(gig_id, bidder_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewed_id ON reviews(reviewed_id);
CREATE INDEX IF NOT EXISTS idx_reviews_gig_id ON reviews(gig_id);
CREATE INDEX IF NOT EXISTS idx_saved_gigs_user_gig ON saved_gigs(user_id, gig_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_msg ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_discoverable ON users(is_discoverable) WHERE is_discoverable = true;
CREATE INDEX IF NOT EXISTS idx_resume_analyses_user ON resume_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_fraud_reports_gig ON fraud_reports(gig_id);
CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
