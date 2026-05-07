import React, { createContext, useContext, useState, useCallback } from 'react';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Snackbar from '@mui/material/Snackbar';

const AlertContext = createContext();

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within AlertProvider');
  }
  return context;
};

export const AlertProvider = ({ children }) => {
  const [alerts, setAlerts] = useState([]);

  const showAlert = useCallback((message, severity = 'info', title = null) => {
    const id = Date.now();
    setAlerts(prev => [...prev, { id, message, severity, title }]);
    return id;
  }, []);

  const hideAlert = useCallback((id) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  }, []);

  const success = useCallback((message, title = null) => {
    return showAlert(message, 'success', title);
  }, [showAlert]);

  const error = useCallback((message, title = null) => {
    return showAlert(message, 'error', title);
  }, [showAlert]);

  const warning = useCallback((message, title = null) => {
    return showAlert(message, 'warning', title);
  }, [showAlert]);

  const info = useCallback((message, title = null) => {
    return showAlert(message, 'info', title);
  }, [showAlert]);

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert, success, error, warning, info }}>
      {children}
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999 }}>
        {alerts.map((alert, index) => (
          <Snackbar
            key={alert.id}
            open={true}
            autoHideDuration={6000}
            onClose={() => hideAlert(alert.id)}
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            style={{ position: 'relative', marginBottom: index > 0 ? 8 : 0 }}
          >
            <Alert 
              onClose={() => hideAlert(alert.id)} 
              severity={alert.severity}
              variant="filled"
              sx={{ width: '100%', minWidth: '300px' }}
            >
              {alert.title && <AlertTitle>{alert.title}</AlertTitle>}
              {alert.message}
            </Alert>
          </Snackbar>
        ))}
      </div>
    </AlertContext.Provider>
  );
};
