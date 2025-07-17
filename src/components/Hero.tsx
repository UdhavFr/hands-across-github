import { Heart, Users, Calendar } from 'lucide-react';

export function Hero() {
  return (
    <div className="relative bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="relative z-10 pb-8 sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32">
          <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
            <div className="sm:text-center lg:text-left">
              <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
                <span className="block">Make a difference</span>
                <span className="block text-rose-600">Join hands today</span>
              </h1>
              <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                Connect with NGOs, participate in meaningful events, and create positive change in your community. Start your volunteering journey today.
              </p>
              <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
                <div className="rounded-md shadow">
                  <a
                    href="http://localhost:5173/#events"
                    className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-rose-600 hover:bg-rose-700 md:py-4 md:text-lg md:px-10"
                  >
                    Register for Events
                  </a>
                </div>
                <div className="mt-3 sm:mt-0 sm:ml-3">
                  <a
                    href="http://localhost:5173/#ngos"
                    className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-rose-600 bg-rose-100 hover:bg-rose-200 md:py-4 md:text-lg md:px-10"
                  >
                    Enrol to NGOs
                  </a>
                </div>
              </div>
            </div>
          </main>
        </div>
        <div className="lg:absolute lg:inset-y-0 lg:right-0 lg:w-2/5 xl:w-1/2 lg:h-[500px] lg:max-h-[600px]">
          <img
            className="h-56 w-full object-cover sm:h-72 md:h-96 lg:w-full lg:h-full"
            src="https://images.unsplash.com/photo-1559027615-cd4628902d4a?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80"
            alt="Volunteers working together"
          />
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex items-center space-x-4 p-6 bg-rose-50 rounded-lg">
            <Heart className="h-10 w-10 text-rose-600" />
            <div>
              <h3 className="font-semibold text-lg">Make an Impact</h3>
              <p className="text-gray-600">Contribute to meaningful causes</p>
            </div>
          </div>
          <div className="flex items-center space-x-4 p-6 bg-rose-50 rounded-lg">
            <Users className="h-10 w-10 text-rose-600" />
            <div>
              <h3 className="font-semibold text-lg">Connect</h3>
              <p className="text-gray-600">Join a community of changemakers</p>
            </div>
          </div>
          <div className="flex items-center space-x-4 p-6 bg-rose-50 rounded-lg">
            <Calendar className="h-10 w-10 text-rose-600" />
            <div>
              <h3 className="font-semibold text-lg">Flexible Schedule</h3>
              <p className="text-gray-600">Find events that fit your time</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
