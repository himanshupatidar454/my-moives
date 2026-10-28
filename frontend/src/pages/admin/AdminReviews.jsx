import { useState, useEffect } from 'react';
import { reviewService } from '../../services/reviewService';
import { toast } from 'react-toastify';
import { IconTrash } from '../../components/common/Icons';

export const AdminReviews = () => {
  const [reviews, setReviews] = useState([]);

  const fetchReviews = async () => {
    try {
      const res = await reviewService.getAllReviewsAdmin();
      setReviews(res.reviews || []);
    } catch (err) {
      console.error('Failed fetching reviews for admin', err);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleDeleteReview = async (id) => {
    try {
      await reviewService.deleteReview(id);
      toast.info('Review removed from cinema catalogue.');
      fetchReviews();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete review.');
    }
  };

  const getMovieTitle = (rev) => {
    if (rev.movie && typeof rev.movie === 'object' && rev.movie.title) {
      return rev.movie.title;
    }
    return rev.movieTitle || 'Cinema Movie';
  };

  const getReviewerName = (rev) => {
    if (rev.user && typeof rev.user === 'object' && rev.user.name) {
      return rev.user.name;
    }
    return rev.userName || rev.author || 'Cinema Enthusiast';
  };

  const getReviewerAvatar = (rev) => {
    if (rev.user && typeof rev.user === 'object' && rev.user.avatar) {
      return rev.user.avatar;
    }
    return rev.userAvatar || rev.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80';
  };

  return (
    <div className="admin-reviews-page">
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="fw-extrabold text-white mb-1">Audience Review Moderation</h2>
          <p className="text-white-50 small mb-0">Inspect customer feedback, filter inappropriate remarks, and maintain review standards.</p>
        </div>

        <span className="badge bg-danger rounded-pill px-3 py-2">
          {reviews.length} Published Reviews
        </span>
      </div>

      <div className="p-4 rounded-4 shadow" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
        <div className="table-responsive">
          <table className="table table-cinema mb-0">
            <thead>
              <tr>
                <th>Reviewer</th>
                <th>Target Movie</th>
                <th>Rating</th>
                <th>Review Synopsis</th>
                <th>Date</th>
                <th>Purchase Status</th>
                <th className="text-end">Moderation</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((rev) => (
                <tr key={rev.id || rev._id}>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <img
                        src={getReviewerAvatar(rev)}
                        alt={getReviewerName(rev)}
                        className="rounded-circle object-fit-cover shadow-sm"
                        width="32"
                        height="32"
                      />
                      <span className="fw-bold text-white small">{getReviewerName(rev)}</span>
                    </div>
                  </td>
                  <td className="text-white fw-medium">{getMovieTitle(rev)}</td>
                  <td>
                    <span className="badge bg-warning bg-opacity-25 text-warning border border-warning border-opacity-25 px-2 py-1">
                      {rev.rating} ★
                    </span>
                  </td>
                  <td style={{ maxWidth: '320px' }}>
                    <p className="text-white-50 small mb-0 text-truncate">
                      "{rev.reviewText || rev.comment || rev.content}"
                    </p>
                  </td>
                  <td className="text-white-50 small">{rev.date || (rev.createdAt ? new Date(rev.createdAt).toISOString().split('T')[0] : 'Recent')}</td>
                  <td>
                    <span className={`badge ${rev.verifiedPurchase ? 'bg-success' : 'bg-secondary'} bg-opacity-25 ${rev.verifiedPurchase ? 'text-success' : 'text-white-50'}`}>
                      {rev.verifiedPurchase ? 'Verified' : 'Audience'}
                    </span>
                  </td>
                  <td className="text-end">
                    <button
                      type="button"
                      onClick={() => handleDeleteReview(rev.id || rev._id)}
                      className="btn btn-sm btn-outline-danger p-1"
                      title="Delete Review"
                    >
                      <IconTrash size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
