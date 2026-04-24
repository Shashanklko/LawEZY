import { useState, useCallback } from 'react';

/**
 * Controller Hook for Consultation logic (MVC: Controller)
 */
export const useConsultation = () => {
  const [isConsulting, setIsConsulting] = useState(false);
  const [activeSession, setActiveSession] = useState(null);

  const startVideoConsultation = useCallback((lawyerId) => {
    setIsConsulting(true);
    setActiveSession({ id: Date.now(), type: 'video', lawyerId });
    console.log(`Starting video session with lawyer: ${lawyerId}`);
  }, []);

  const endConsultation = useCallback(() => {
    setIsConsulting(false);
    setActiveSession(null);
  }, []);

  return {
    isConsulting,
    activeSession,
    startVideoConsultation,
    endConsultation
  };
};

