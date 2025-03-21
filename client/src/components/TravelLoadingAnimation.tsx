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
        <svg 
          className={`${currentSize.cloud} text-primary/20`} 
          viewBox="0 0 24 24" 
          fill="currentColor" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            d="M4.5 9.5C4.5 8.12 5.62 7 7 7C8.21 7 9.19 7.77 9.44 8.83C9.54 8.67 9.73 8.5 10 8.5C10.83 8.5 11.5 9.17 11.5 10C11.5 10.14 11.48 10.28 11.43 10.4C11.56 10.35 11.68 10.33 11.8 10.33C12.46 10.33 13 10.87 13 11.53C13 12.19 12.46 12.74 11.8 12.74H5.7C5.03 12.74 4.5 12.2 4.5 11.54C4.5 11.11 4.74 10.74 5.1 10.56C5.03 10.39 5 10.21 5 10C5 9.62 5.17 9.26 5.46 9C5.46 9 5.5 9.5 4.5 9.5Z" 
            fill="currentColor"
          />
        </svg>
      </motion.div>
      
      <motion.div
        className="absolute bottom-1/4 right-0"
        animate={{ x: [0, -10, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      >
        <svg 
          className={`${currentSize.cloud} text-primary/20`} 
          viewBox="0 0 24 24" 
          fill="currentColor" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            d="M22 13.35C22 10.96 20.06 9 17.7 9C15.67 9 13.94 10.44 13.5 12.35C13 12.12 12.46 12 11.88 12C9.74 12 8 13.76 8 15.93C8 18.07 9.74 19.86 11.88 19.86H21.5C21.78 19.86 22 19.64 22 19.35V13.35Z" 
            fill="currentColor"
          />
        </svg>
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