// src/pages/UserCertificateView.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getImageUrl as getImageUrlFromConfig } from '../utils/config';
import { buildApiUrl } from '../utils/apiConfig';
import { 
  ArrowLeftIcon, 
  DocumentIcon,
  CalendarIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { useAlert } from "../components/AlertNotification";
import ConfirmDialog from '../components/ConfirmDialog';
import { formatDateDDMMYY } from '../utils/dateFormatter';

const UserCertificateView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTab = searchParams.get('returnTab') || 'overview';
  const { user } = useAuth();
  const { success, error: showError, warning, info } = useAlert();
  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteRequestDialog, setShowDeleteRequestDialog] = useState(false);

  useEffect(() => {
    fetchCertificate();
  }, [id]);

  const fetchCertificate = async () => {
    try {
      setLoading(true);
      const response = await fetch(buildApiUrl(`/certificates/${id}`), {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setCertificate(data);
      } else {
        setError('Certificate not found');
      }
    } catch (error) {
      console.error('Error fetching certificate:', error);
      setError('Failed to load certificate');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRequest = async () => {
    try {
      const response = await fetch(buildApiUrl('/certificates/delete-request'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          certificateId: certificate._id,
          certificateName: certificate.certificate,
          userEmail: user.email,
          userName: `${user.firstName} ${user.lastName}`,
          profileId: certificate.profileId
        })
      });

      if (response.ok) {
        success('Delete request sent to admin successfully!');
        navigate(`/user-dashboard?tab=${returnTab}`);
      } else {
        showError('Failed to send delete request. Please try again.');
      }
    } catch (err) {
      console.error('Error sending delete request:', err);
      showError('Failed to send delete request. Please try again.');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    const date = new Date(dateString);
    // First ensure we have a valid date
    if (isNaN(date.getTime())) return 'Not specified';
    // For display in view, use localized format
    return formatDateDDMMYY(date);
  };

  const getCertificateStatus = (expiryDate) => {
    if (!expiryDate) return { status: 'Active', color: 'text-green-600', bgColor: 'bg-green-100' };
    
    const now = new Date();
    const expiry = new Date(expiryDate);
    const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
    
    if (expiry < now) {
      return { status: 'Expired', color: 'text-red-600', bgColor: 'bg-red-100' };
    } else if (expiry <= thirtyDaysFromNow) {
      return { status: 'Expiring Soon', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    } else {
      return { status: 'Active', color: 'text-green-600', bgColor: 'bg-green-100' };
    }
  };

  // Use the getImageUrl from config which correctly uses SERVER_BASE_URL
  const getImageUrl = getImageUrlFromConfig;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading certificate...</p>
        </div>
      </div>
    );
  }

  if (error || !certificate) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <DocumentIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Certificate not found</h3>
          <p className="text-gray-500 mb-4">{error || 'The certificate you are looking for does not exist.'}</p>
          <button
            onClick={() => navigate(`/user-dashboard?tab=${returnTab}`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const status = getCertificateStatus(certificate.expiryDate);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <button
                onClick={() => navigate(`/user-dashboard?tab=${returnTab}`)}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600"
              >
                <ArrowLeftIcon className="h-6 w-6" />
              </button>
              <div className="flex items-center">
                <DocumentIcon className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Certificate Details</h1>
                  <p className="text-sm text-gray-500">View your certificate information</p>
                </div>
              </div>
            </div>
            {/*<button
              onClick={() => setShowDeleteRequestDialog(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              Request Deletion
            </button>*/}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {/* Certificate Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{certificate.certificate}</h2>
                <p className="text-sm text-gray-500 mt-1">Category: {certificate.category}</p>
              </div>
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${status.bgColor} ${status.color}`}>
                {status.status}
              </span>
            </div>
          </div>

          {/* Certificate Details */}
          <div className="px-6 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start">
                  <BuildingOfficeIcon className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Provider</dt>
                    <dd className="text-sm text-gray-900">{certificate.provider || 'Not specified'}</dd>
                  </div>
                </div>

                <div className="flex items-start">
                  <CalendarIcon className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Issue Date</dt>
                    <dd className="text-sm text-gray-900">{formatDate(certificate.issueDate)}</dd>
                  </div>
                </div>

                <div className="flex items-start">
                  <CalendarIcon className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Expiry Date</dt>
                    <dd className="text-sm text-gray-900">{formatDate(certificate.expiryDate)}</dd>
                  </div>
                </div>

                {certificate.cost && (
                  <div className="flex items-start">
                    <CurrencyDollarIcon className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Cost</dt>
                      <dd className="text-sm text-gray-900">{certificate.cost}</dd>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Profile Name</dt>
                  <dd className="text-sm text-gray-900">{certificate.profileName || 'Not specified'}</dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-gray-500">Job Role</dt>
                  <dd className="text-sm text-gray-900">{certificate.jobRole || 'Not specified'}</dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="text-sm text-gray-900">{certificate.status || 'Active'}</dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-gray-500">Created On</dt>
                  <dd className="text-sm text-gray-900">{formatDate(certificate.createdOn)}</dd>
                </div>
              </div>
            </div>

            {/* Certificate File Display */}
            {certificate.certificateFile && (
              <div className="mt-8">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Certificate Document</h3>
                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  {certificate.certificateFile.endsWith('.pdf') ? (
                    <div className="bg-gray-50 p-4">
                      <iframe
                        src={getImageUrl(certificate.certificateFile)}
                        className="w-full h-96 border-0"
                        title="Certificate PDF"
                        loading="lazy"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextElementSibling.style.display = 'block';
                        }}
                      />
                      <div className="hidden text-center py-8">
                        <DocumentIcon className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                        <p className="text-gray-500">PDF preview not available</p>
                        <a
                          href={getImageUrl(certificate.certificateFile)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center mt-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200"
                        >
                          Download PDF
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4">
                      <img
                        src={getImageUrl(certificate.certificateFile)}
                        alt="Certificate"
                        className="max-w-full h-auto mx-auto"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextElementSibling.style.display = 'block';
                        }}
                      />
                      <div className="hidden text-center py-8">
                        <DocumentIcon className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                        <p className="text-gray-500">Image preview not available</p>
                        <a
                          href={getImageUrl(certificate.certificateFile)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center mt-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200"
                        >
                          View File
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Request Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteRequestDialog}
        onOpenChange={setShowDeleteRequestDialog}
        title="Request Certificate Deletion"
        description="Are you sure you want to request deletion of this certificate? This will send a request to the admin for approval."
        onConfirm={handleDeleteRequest}
        confirmText="Send Request"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
};

export default UserCertificateView;
