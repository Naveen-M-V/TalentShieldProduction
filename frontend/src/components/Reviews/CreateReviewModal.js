import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { buildApiUrl } from '../../utils/apiConfig';

const API_BASE = buildApiUrl('/');

export default function CreateReviewModal({ isOpen, onClose, onSuccess, editingReview }) {
    // Legacy review modal removed in favor of rebuilt Reviews page.
    return null;
}
