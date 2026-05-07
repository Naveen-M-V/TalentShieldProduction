import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { buildApiUrl } from '../../utils/apiConfig';

const API_BASE = buildApiUrl('/');

export default function CommentReviewModal({ isOpen, onClose, onSuccess, review }) {
    // Legacy review comment modal removed in favor of rebuilt Reviews page.
    return null;
}
