import React from 'react';

interface FeatureShowcaseProps {
  title: string;
  description: string;
  features: {
    icon: string;
    title: string;
    description: string;
    benefits: string[];
  }[];
}

const FeatureShowcase: React.FC<FeatureShowcaseProps> = ({ title, description, features }) => {
  return (
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">{title}</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">{description}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 border border-gray-100"
            >
              <div className="text-5xl mb-6 text-center">{feature.icon}</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">{feature.title}</h3>
              <p className="text-gray-600 mb-6 text-center leading-relaxed">{feature.description}</p>
              
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">Key Benefits:</h4>
                <ul className="space-y-2">
                  {feature.benefits.map((benefit, benefitIndex) => (
                    <li key={benefitIndex} className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                      <span className="text-gray-700">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeatureShowcase;
