import React from "react";
import { motion } from "framer-motion";

interface TravelLoadingAnimationProps {
  size?: "small" | "medium" | "large";
}

export function TravelLoadingAnimation({ size = "medium" }: TravelLoadingAnimationProps) {
  // Size mapping
  const sizeMap = {
    small: {
      container: "w-8 h-8",
      plane: "w-4 h-4",
      cloud: "w-2 h-2",
      dots: "w-1 h-1",
    },
    medium: {
      container: "w-16 h-16",
      plane: "w-8 h-8",
      cloud: "w-4 h-4",
      dots: "w-1.5 h-1.5",
    },
    large: {
      container: "w-24 h-24",
      plane: "w-12 h-12",
      cloud: "w-6 h-6",
      dots: "w-2 h-2",
    },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`relative ${currentSize.container}`}>
      {/* Circular path for the plane to follow */}
      <div className="absolute inset-0 rounded-full border-2 border-dashed border-primary/30 animate-pulse" />
      
      {/* Airplane */}
      <motion.div
        className="absolute"
        animate={{
          x: [-20, 20, -20],
          y: [-15, 15, -15],
          rotate: [-10, 10, -10]
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
          times: [0, 0.5, 1]
        }}
        style={{
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      >
        <svg 
          className={`${currentSize.plane} text-primary`} 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Airplane body */}
          <path
            d="M12 2C9.5 2 4 3.5 4 12C4 20.5 9.5 22 12 22C14.5 22 20 20.5 20 12C20 3.5 14.5 2 12 2Z"
            fill="currentColor"
            fillOpacity="0.2"
          />
          <path
            d="M17.5 12H21.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M3 12H6.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Main airplane body */}
          <path
            d="M12 18.5C15.5899 18.5 18.5 15.5899 18.5 12C18.5 8.41015 15.5899 5.5 12 5.5C8.41015 5.5 5.5 8.41015 5.5 12C5.5 15.5899 8.41015 18.5 12 18.5Z"
            fill="currentColor"
          />
          {/* Wings */}
          <path
            d="M4.5 10L12 12L19.5 10"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M4.5 14L12 12L19.5 14"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Windows */}
          <circle cx="10" cy="10" r="0.75" fill="white" />
          <circle cx="12" cy="10" r="0.75" fill="white" />
          <circle cx="14" cy="10" r="0.75" fill="white" />
          <circle cx="10" cy="14" r="0.75" fill="white" />
          <circle cx="12" cy="14" r="0.75" fill="white" />
          <circle cx="14" cy="14" r="0.75" fill="white" />
        </svg>
      </motion.div>

      {/* Clouds */}
      <motion.div
        className="absolute top-1/4 left-0"
        animate={{ x: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className={`${currentSize.cloud} bg-primary/20 rounded-full`}></div>
      </motion.div>
      
      <motion.div
        className="absolute bottom-1/4 right-0"
        animate={{ x: [0, -10, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      >
        <div className={`${currentSize.cloud} bg-primary/20 rounded-full`}></div>
      </motion.div>

      {/* Loading dots */}
      <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-1">
        <motion.div
          className={`${currentSize.dots} bg-primary rounded-full`}
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0 }}
        />
        <motion.div
          className={`${currentSize.dots} bg-primary rounded-full`}
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        />
        <motion.div
          className={`${currentSize.dots} bg-primary rounded-full`}
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
      </div>
    </div>
  );
}