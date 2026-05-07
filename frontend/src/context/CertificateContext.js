import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import axios from "axios";
import { buildApiUrl } from "../utils/apiConfig";

const CertificateContext = createContext();

export const useCertificates = () => {
  const context = useContext(CertificateContext);
  if (!context) throw new Error("useCertificates must be used within a CertificateProvider");
  return context;
};

const parseExpiryDate = (expiryDateStr) => {
  if (!expiryDateStr) return null;
  
  // Handle Date objects
  if (expiryDateStr instanceof Date) return expiryDateStr;
  
  // Handle ISO date strings (YYYY-MM-DD or full ISO format)
  if (typeof expiryDateStr === 'string' && expiryDateStr.includes('-')) {
    return new Date(expiryDateStr);
  }
  
  // Handle DD/MM/YYYY format
  if (typeof expiryDateStr === 'string' && expiryDateStr.includes('/')) {
    const [day, month, year] = expiryDateStr.split("/");
    return new Date(year, month - 1, day);
  }
  
  // Fallback: try to parse as is
  return new Date(expiryDateStr);
};

export const CertificateProvider = ({ children }) => {
  const [certificates, setCertificates] = useState([]);
  const [loadingCount, setLoadingCount] = useState(0);
  const loading = loadingCount > 0;
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  
  const refreshTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef(null);
  const MAX_CERT_CACHE_SIZE = 500 * 1024; // 500KB limit

  const incrementLoading = () => setLoadingCount((count) => count + 1);
  const decrementLoading = () => setLoadingCount((count) => Math.max(count - 1, 0));

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  const fetchCertificates = useCallback(async (page = 1, limit = 50) => {
    if (!isMountedRef.current) return;
    
    incrementLoading();
    try {
      const url = buildApiUrl('/certificates');
      const response = await axios.get(url, {
        params: {
          page,
          limit
        },
        headers: { 
          "Cache-Control": "max-age=300",
          "If-None-Match": localStorage.getItem('certificatesEtag')
        },
      });
      
      // Update cache if data has changed (with size limit)
      if (response.headers.etag && isMountedRef.current) {
        try {
          const cacheData = JSON.stringify(response.data);
          if (cacheData.length < MAX_CERT_CACHE_SIZE) {
            localStorage.setItem('certificatesEtag', response.headers.etag);
            localStorage.setItem('certificatesCache', cacheData);
          } else {
            console.warn(`Certificate cache too large (${(cacheData.length / 1024).toFixed(2)}KB), skipping`);
            localStorage.removeItem('certificatesCache');
            localStorage.removeItem('certificatesEtag');
          }
        } catch (storageError) {
          console.warn('Certificate cache error:', storageError);
          localStorage.removeItem('certificatesCache');
          localStorage.removeItem('certificatesEtag');
        }
      }

      if (!Array.isArray(response.data)) {
        if (isMountedRef.current) {
          setCertificates([]);
          setError("Invalid data format received from API");
        }
        return;
      }
      if (isMountedRef.current) {
        setCertificates(response.data);
        setError(null);
      }
    } catch (error) {
      if (error.response?.status === 304) {
        // Use cached data if available
        try {
          const cachedData = localStorage.getItem('certificatesCache');
          if (cachedData && isMountedRef.current) {
            setCertificates(JSON.parse(cachedData));
            setError(null);
            return;
          }
        } catch (parseError) {
          console.warn('Cache parse error:', parseError);
        }
      }
      if (isMountedRef.current) {
        setError("Failed to fetch certificates");
        setCertificates([]);
      }
    } finally {
      if (isMountedRef.current) {
        decrementLoading();
      }
    }
  }, []);

  const addCertificate = useCallback(async (newCertificate) => {
    if (!isMountedRef.current) return;
    
    setCreating(true);
    incrementLoading();
    try {
      const formData = new FormData();
      Object.entries(newCertificate).forEach(([key, val]) => {
        if (key === "fileData" && val) {
          formData.append("certificateFile", val);
        } else if (key === "timeLogged" && typeof val === "object") {
          formData.append("timeLogged", JSON.stringify(val));
        } else if (val !== null && val !== undefined) {
          formData.append(key, val);
        }
      });
      const url = buildApiUrl('/certificates');
      console.log('Sending certificate (keys):', Object.keys(newCertificate), 'fileSize:', newCertificate.fileData?.size || 0);
      const response = await axios.post(url, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setCertificates((prev) => [response.data, ...prev]);
      setError(null);
      
      // FIXED: Clear any existing timeout before creating a new one
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      
      // Store timeout ID for cleanup
      refreshTimeoutRef.current = setTimeout(() => {
        fetchCertificates();
        refreshTimeoutRef.current = null;
      }, 500);
      
      return response.data;
    } catch (err) {
      if (isMountedRef.current) {
        setError("Failed to add certificate");
      }
      console.error('Add certificate error:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      throw err;
    } finally {
      if (isMountedRef.current) {
        setCreating(false);
        decrementLoading();
      }
    }
  }, [fetchCertificates]);

  // Updated uploadCertificateFile to use PUT and matching URL
  const uploadCertificateFile = useCallback(async (certificateId, file) => {
    if (!certificateId || !file) throw new Error("certificateId and file are required");
    incrementLoading();
    try {
      const formData = new FormData();
      formData.append("certificateFile", file);
      const url = buildApiUrl(`/certificates/${certificateId}/upload`);
      const response = await axios.put(
        url,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      if (response && response.data) {
        setCertificates((prev) =>
          prev.map((c) => (c._id === certificateId || c.id === certificateId ? response.data : c))
        );
      } else {
        setCertificates((prev) =>
          prev.map((c) =>
            c._id === certificateId || c.id === certificateId ? { ...c, certificateFile: true } : c
          )
        );
      }
      setError(null);
      return response?.data;
    } catch (err) {
      setError("Failed to upload certificate file");
      console.error(err);
      throw err;
    } finally {
      decrementLoading();
    }
  }, []);

  // Update a certificate
  const updateCertificate = useCallback(async (certificateId, updatedData) => {
    if (!certificateId) throw new Error("certificateId is required");
    setUpdating(true);
    incrementLoading();
    try {
      const url = buildApiUrl(`/certificates/${certificateId}`);
      console.log('Updating certificate:', url);
      const response = await axios.put(url, updatedData);
      setCertificates((prev) =>
        prev.map((c) => (c._id === certificateId || c.id === certificateId ? response.data : c))
      );
      setError(null);
      console.log('Certificate updated successfully');
      
      // FIXED: Clear any existing timeout before creating a new one
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      
      refreshTimeoutRef.current = setTimeout(() => {
        fetchCertificates();
        refreshTimeoutRef.current = null;
      }, 500);
      
      return response.data;
    } catch (err) {
      setError("Failed to update certificate");
      console.error('Update certificate error:', err);
      throw err;
    } finally {
      setUpdating(false);
      decrementLoading();
    }
  }, [fetchCertificates]);

  // Delete a certificate
  const deleteCertificate = useCallback(async (certificateId) => {
    if (!certificateId) throw new Error("certificateId is required");
    setDeleting(true);
    incrementLoading();
    try {
      const url = buildApiUrl(`/certificates/${certificateId}`);
      console.log('Deleting certificate:', url);
      await axios.delete(url);
      setCertificates((prev) =>
        prev.filter((c) => c._id !== certificateId && c.id !== certificateId)
      );
      setError(null);
      console.log('Certificate deleted successfully');
      
      // FIXED: Clear any existing timeout before creating a new one
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      
      refreshTimeoutRef.current = setTimeout(() => {
        fetchCertificates();
        refreshTimeoutRef.current = null;
      }, 500);
      
    } catch (err) {
      setError("Failed to delete certificate");
      console.error('Delete certificate error:', err);
      throw err;
    } finally {
      setDeleting(false);
      decrementLoading();
    }
  }, [fetchCertificates]);

  // Other helper functions...

  const getActiveCertificatesCount = useCallback(() => {
    if (!Array.isArray(certificates)) {
      console.error("Expected an array of certificates but got:", certificates);
      return 0;
    }
    return certificates.filter(
      (cert) => cert.active === "Yes" || cert.status === "Active"
    ).length;
  }, [certificates]);

  const getExpiringCertificates = useCallback(
    (days = 30) => {
      if (!Array.isArray(certificates)) return [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + days);
      futureDate.setHours(23, 59, 59, 999);
      return certificates.filter((cert) => {
        const expiryDate = parseExpiryDate(cert.expiryDate);
        if (!expiryDate) return false;
        expiryDate.setHours(23, 59, 59, 999);
        return expiryDate >= today && expiryDate <= futureDate;
      });
    },
    [certificates]
  );

  const getExpiredCertificates = useCallback(() => {
    if (!Array.isArray(certificates)) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return certificates.filter((cert) => {
      const expiryDate = parseExpiryDate(cert.expiryDate);
      if (!expiryDate) return false;
      expiryDate.setHours(23, 59, 59, 999);
      return expiryDate < today;
    });
  }, [certificates]);

  const getCertificatesByCategory = useCallback(() => {
    const counts = {};
    for (const cert of certificates) {
      const category = cert.category || "Other";
      counts[category] = (counts[category] || 0) + 1;
    }
    return counts;
  }, [certificates]);

  const getCertificatesByJobRole = useCallback(() => {
    const counts = {};
    for (const cert of certificates) {
      const jobRole = cert.jobRole || "Unspecified";
      counts[jobRole] = (counts[jobRole] || 0) + 1;
    }
    return counts;
  }, [certificates]);

  const value = useMemo(
    () => ({
      certificates,
      loading,
      error,
      fetchCertificates,
      addCertificate,
      updateCertificate,
      uploadCertificateFile,
      deleteCertificate,
      getCertificateById: (id) => certificates.find((cert) => cert._id === id || cert.id === id),
      getActiveCertificatesCount,
      getExpiringCertificates,
      getExpiredCertificates,
      getCertificatesByCategory,
      getCertificatesByJobRole,
      creating,
      updating,
      deleting,
      uploading,
    }),
    [
      certificates,
      loading,
      creating,
      updating,
      deleting,
      uploading,
      error,
      fetchCertificates,
      addCertificate,
      updateCertificate,
      uploadCertificateFile,
      deleteCertificate,
      getActiveCertificatesCount,
      getExpiringCertificates,
      getExpiredCertificates,
      getCertificatesByCategory,
      getCertificatesByJobRole,
    ]
  );

  useEffect(() => {
    if (isMountedRef.current) {
      fetchCertificates();
    }
  }, []);

  return <CertificateContext.Provider value={value}>{children}</CertificateContext.Provider>;
};