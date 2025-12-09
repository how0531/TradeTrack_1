
import React from 'react';

export const DashboardSkeleton = () => {
    return (
        <div className="min-h-screen bg-[#0B0C10] pb-20 overflow-hidden">
            {/* Header Area */}
            <div className="w-full max-w-md pb-4 rounded-b-[24px] bg-[#141619] border-b border-white/5 mx-auto">
                <div className="px-5 pt-5 pb-0 animate-pulse">
                    <div className="flex justify-between items-center mb-4">
                        <div className="h-5 w-24 bg-white/10 rounded"></div>
                        <div className="flex gap-3">
                            <div className="h-6 w-20 bg-white/10 rounded-lg"></div>
                            <div className="h-6 w-6 bg-white/10 rounded-full"></div>
                        </div>
                    </div>
                    
                    <div className="flex flex-col mb-4 space-y-2">
                        <div className="flex justify-between items-baseline">
                            <div className="h-10 w-40 bg-white/10 rounded"></div>
                            <div className="flex flex-col items-end gap-1">
                                <div className="h-6 w-12 bg-white/10 rounded"></div>
                                <div className="h-3 w-16 bg-white/5 rounded"></div>
                            </div>
                        </div>
                        <div className="h-5 w-24 bg-white/10 rounded"></div>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                         <div className="h-7 w-20 bg-white/10 rounded-lg"></div>
                         <div className="h-7 flex-1 bg-white/10 rounded-lg"></div>
                    </div>

                    <div className="h-[100px] w-full bg-white/5 rounded-lg mb-1"></div>
                    <div className="h-[40px] w-full bg-white/5 rounded-lg opacity-50"></div>
                </div>
            </div>

            {/* Content Area */}
            <div className="w-full max-w-md px-4 py-5 mx-auto space-y-5 animate-pulse">
                <div className="grid grid-cols-2 gap-2">
                    <div className="h-20 bg-[#141619] rounded-xl border border-white/5"></div>
                    <div className="h-20 bg-[#141619] rounded-xl border border-white/5"></div>
                    <div className="col-span-2 h-24 bg-[#141619] rounded-xl border border-white/5"></div>
                    <div className="h-20 bg-[#141619] rounded-xl border border-white/5"></div>
                    <div className="h-20 bg-[#141619] rounded-xl border border-white/5"></div>
                </div>
                <div className="h-40 bg-[#141619] rounded-xl border border-white/5"></div>
            </div>
            
            {/* Bottom Nav */}
            <div className="fixed bottom-0 left-0 right-0 h-16 bg-[#0B0C10] border-t border-white/5 flex items-center justify-center">
                <div className="h-8 w-64 bg-white/5 rounded-full"></div>
            </div>
        </div>
    );
};
