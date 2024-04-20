import React from "react";

interface AppTitleProps {
  title: string;
}

const AppTitle: React.FC<AppTitleProps> = ({ title }) => {
  return (
    <div className="flex items-center justify-between p-4">
      <h1 className="text-3xl font-bold text-gray-800">{title}</h1>
    </div>
  );
};

export default AppTitle;
