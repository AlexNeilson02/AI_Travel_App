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
          rotate: 360,
          x: [0, 10, 0, -10, 0],
          y: [0, -10, 0, 10, 0]
        }}
        transition={{
          rotate: {
            duration: 3,
            repeat: Infinity,
            ease: "linear"
          },
          x: {
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          },
          y: {
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }
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
          <path
            d="M21.86 12.76L19.15 14L15.36 15.27L9 18L8.91 18L5.18 13.73L5 13.55L4.82 13.37L5.53 13.15L9 12L12.35 10.89L12.36 10.89L17.85 8.88L19.15 8.5L21.86 11.24C22.04 11.43 22.04 11.57 21.86 12.76Z"
            fill="currentColor"
          />
          <path
            d="M9 18L5.18 13.73L5 13.55L4.82 13.37L3.58 16.15C3.23 16.95 3.4 17.85 4 18.45L4.71 19.16C5.3 19.75 6.2 19.93 7 19.58L9 18Z"
            fill="currentColor"
          />
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