'use client';

import { useState } from 'react';
import { createJob } from '../actions';
import { Plus, Trash2, Pencil } from 'lucide-react';

export default function CreateJobPage() {
    const [containers, setContainers] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [newContainer, setNewContainer] = useState({
        id: 0,
        containerNo: '',
        sizeType: '20ft',
        sealNo: '',
        chassisNo: '',
        transporterName: '',
        cost: 0,
        location: '',
        gateInDate: '',
        gateOutDate: '',
        deliveryOrderNo: ''
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setNewContainer(prev => ({ ...prev, [name]: value }));
    };

    const saveContainer = () => {
        if (!newContainer.containerNo) {
            alert("Container No is required");
            return;
        }

        if (editingId) {
            setContainers(containers.map(c => c.id === editingId ? { ...newContainer, id: editingId } : c));
        } else {
            setContainers([...containers, { ...newContainer, id: Date.now() }]);
        }

        setNewContainer({
            id: 0,
            containerNo: '',
            sizeType: '20ft',
            sealNo: '',
            chassisNo: '',
            transporterName: '',
            cost: 0,
            location: '',
            gateInDate: '',
            gateOutDate: '',
            deliveryOrderNo: ''
        });
        setEditingId(null);
        setIsModalOpen(false);
    };

    const editContainer = (container: any) => {
        setNewContainer(container);
        setEditingId(container.id);
        setIsModalOpen(true);
    };

    const removeContainer = (id: number) => {
        setContainers(containers.filter((c) => c.id !== id));
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
        setNewContainer({
            id: 0,
            containerNo: '',
            sizeType: '20ft',
            sealNo: '',
            chassisNo: '',
            transporterName: '',
            cost: 0,
            location: '',
            gateInDate: '',
            gateOutDate: '',
            deliveryOrderNo: ''
        });
    };

    return (
        <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold text-slate-900 mb-6">Create New EMKL Job</h1>

            <form action={createJob} className="space-y-8 divide-y divide-slate-200">
                <div className="space-y-6 sm:space-y-5">
                    <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">

                        {/* Job Header Fields */}
                        <div className="sm:col-span-2">
                            <label htmlFor="jobNo" className="block text-sm font-medium text-slate-700">Order No</label>
                            <div className="mt-1">
                                <input type="text" name="jobNo" id="jobNo" required className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-slate-300 rounded-md p-2 border" />
                            </div>
                        </div>

                        <div className="sm:col-span-2">
                            <label htmlFor="date" className="block text-sm font-medium text-slate-700">Date</label>
                            <div className="mt-1">
                                <input type="date" name="date" id="date" required className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-slate-300 rounded-md p-2 border" />
                            </div>
                        </div>

                        <div className="sm:col-span-2">
                            <label htmlFor="customer" className="block text-sm font-medium text-slate-700">Customer</label>
                            <div className="mt-1">
                                <input type="text" name="customer" id="customer" required className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-slate-300 rounded-md p-2 border" />
                            </div>
                        </div>

                        <div className="sm:col-span-3">
                            <label htmlFor="origin" className="block text-sm font-medium text-slate-700">Origin (ASAL)</label>
                            <div className="mt-1">
                                <input type="text" name="origin" id="origin" className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-slate-300 rounded-md p-2 border" />
                            </div>
                        </div>

                        <div className="sm:col-span-3">
                            <label htmlFor="destination" className="block text-sm font-medium text-slate-700">Destination</label>
                            <div className="mt-1">
                                <input type="text" name="destination" id="destination" className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-slate-300 rounded-md p-2 border" />
                            </div>
                        </div>

                        <div className="sm:col-span-2">
                            <label htmlFor="vesselName" className="block text-sm font-medium text-slate-700">Vessel</label>
                            <div className="mt-1">
                                <input type="text" name="vesselName" id="vesselName" className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-slate-300 rounded-md p-2 border" />
                            </div>
                        </div>

                        <div className="sm:col-span-2">
                            <label htmlFor="voyageNo" className="block text-sm font-medium text-slate-700">Voyage No</label>
                            <div className="mt-1">
                                <input type="text" name="voyageNo" id="voyageNo" className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-slate-300 rounded-md p-2 border" />
                            </div>
                        </div>

                        <div className="sm:col-span-2">
                            <label htmlFor="eta" className="block text-sm font-medium text-slate-700">ETA (Tgl Masuk Pelabuhan)</label>
                            <div className="mt-1">
                                <input type="date" name="eta" id="eta" className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-slate-300 rounded-md p-2 border" />
                            </div>
                        </div>

                        <div className="sm:col-span-2">
                            <label htmlFor="forwardingAgent" className="block text-sm font-medium text-slate-700">Forwarding</label>
                            <div className="mt-1">
                                <input type="text" name="forwardingAgent" id="forwardingAgent" className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-slate-300 rounded-md p-2 border" />
                            </div>
                        </div>

                        <div className="sm:col-span-2">
                            <label htmlFor="shippingLine" className="block text-sm font-medium text-slate-700">Shipping Line (Pelayaran)</label>
                            <div className="mt-1">
                                <input type="text" name="shippingLine" id="shippingLine" className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-slate-300 rounded-md p-2 border" />
                            </div>
                        </div>

                        <div className="sm:col-span-2">
                            <label htmlFor="submissionNo" className="block text-sm font-medium text-slate-700">No. Aju</label>
                            <div className="mt-1">
                                <input type="text" name="submissionNo" id="submissionNo" className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-slate-300 rounded-md p-2 border" />
                            </div>
                        </div>

                        <div className="sm:col-span-2">
                            <label htmlFor="jobInvoiceNo" className="block text-sm font-medium text-slate-700">No. Invoice Job</label>
                            <div className="mt-1">
                                <input type="text" name="jobInvoiceNo" id="jobInvoiceNo" className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-slate-300 rounded-md p-2 border" />
                            </div>
                        </div>

                        <div className="sm:col-span-2">
                            <label htmlFor="pebNo" className="block text-sm font-medium text-slate-700">No. PEB</label>
                            <div className="mt-1">
                                <input type="text" name="pebNo" id="pebNo" className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-slate-300 rounded-md p-2 border" />
                            </div>
                        </div>

                        <div className="sm:col-span-2">
                            <label htmlFor="pebDate" className="block text-sm font-medium text-slate-700">Tgl PEB</label>
                            <div className="mt-1">
                                <input type="date" name="pebDate" id="pebDate" className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-slate-300 rounded-md p-2 border" />
                            </div>
                        </div>

                        <div className="sm:col-span-6">
                            <label htmlFor="commodity" className="block text-sm font-medium text-slate-700">Commodity</label>
                            <div className="mt-1">
                                <input type="text" name="commodity" id="commodity" className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-slate-300 rounded-md p-2 border" />
                            </div>
                        </div>

                        <div className="sm:col-span-6">
                            <label htmlFor="remarks" className="block text-sm font-medium text-slate-700">Remarks (Keterangan)</label>
                            <div className="mt-1">
                                <textarea name="remarks" id="remarks" rows={3} className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-slate-300 rounded-md p-2 border" />
                            </div>
                        </div>

                        <input type="hidden" name="containerCount" value={containers.length} />

                        {/* HIDDEN INPUTS FOR CONTAINERS */}
                        {containers.map((container, index) => (
                            <div key={container.id} className="hidden">
                                <input type="hidden" name={`containers[${index}].containerNo`} value={container.containerNo} />
                                <input type="hidden" name={`containers[${index}].sizeType`} value={container.sizeType} />
                                <input type="hidden" name={`containers[${index}].sealNo`} value={container.sealNo} />
                                <input type="hidden" name={`containers[${index}].chassisNo`} value={container.chassisNo} />
                                <input type="hidden" name={`containers[${index}].transporterName`} value={container.transporterName} />
                                <input type="hidden" name={`containers[${index}].cost`} value={container.cost} />
                                <input type="hidden" name={`containers[${index}].location`} value={container.location} />
                                <input type="hidden" name={`containers[${index}].gateInDate`} value={container.gateInDate} />
                                <input type="hidden" name={`containers[${index}].gateOutDate`} value={container.gateOutDate} />
                                <input type="hidden" name={`containers[${index}].deliveryOrderNo`} value={container.deliveryOrderNo} />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="pt-8">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg leading-6 font-medium text-slate-900">Containers</h3>
                        <button type="button" onClick={() => {
                            setEditingId(null);
                            setNewContainer({
                                id: 0,
                                containerNo: '',
                                sizeType: '20ft',
                                sealNo: '',
                                chassisNo: '',
                                transporterName: '',
                                cost: 0,
                                location: '',
                                gateInDate: '',
                                gateOutDate: '',
                                deliveryOrderNo: ''
                            });
                            setIsModalOpen(true);
                        }} className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200">
                            <Plus className="h-4 w-4 mr-2" /> Add Container
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-300">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-900 sm:pl-6">Container No</th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Type</th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Seal No</th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Chassis</th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Transporter</th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Cost</th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Location</th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Gate In</th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Gate Out</th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">DO No</th>
                                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                        <span className="sr-only">Actions</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                                {containers.length === 0 ? (
                                    <tr>
                                        <td colSpan={11} className="py-4 text-center text-sm text-slate-500">No containers added yet.</td>
                                    </tr>
                                ) : (
                                    containers.map((container) => (
                                        <tr key={container.id}>
                                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-slate-900 sm:pl-6">{container.containerNo}</td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{container.sizeType}</td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{container.sealNo}</td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{container.chassisNo}</td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{container.transporterName}</td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{container.cost}</td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{container.location}</td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{container.gateInDate}</td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{container.gateOutDate}</td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{container.deliveryOrderNo}</td>
                                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                                <button
                                                    type="button"
                                                    onClick={() => editContainer(container)}
                                                    className="text-blue-600 hover:text-blue-900 mr-4"
                                                >
                                                    <Pencil className="h-5 w-5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => removeContainer(container.id)}
                                                    className="text-red-600 hover:text-red-900"
                                                >
                                                    <Trash2 className="h-5 w-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="pt-5">
                    <div className="flex justify-end">
                        <button type="submit" className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                            Save Job
                        </button>
                    </div>
                </div>
            </form>

            {/* MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                            <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                        </div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full sm:p-6 relative z-50">
                            <div>
                                <h3 className="text-lg leading-6 font-medium text-slate-900 mb-4">{editingId ? 'Edit Container' : 'Add Container'}</h3>
                                <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-2">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700">Container No</label>
                                        <input type="text" name="containerNo" value={newContainer.containerNo} onChange={handleInputChange} className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 rounded-md border p-2" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700">Type</label>
                                        <select name="sizeType" value={newContainer.sizeType} onChange={handleInputChange} className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 rounded-md border p-2">
                                            <option value="20ft">20ft</option>
                                            <option value="40ft">40ft</option>
                                            <option value="45ft">45ft</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700">Seal No</label>
                                        <input type="text" name="sealNo" value={newContainer.sealNo} onChange={handleInputChange} className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 rounded-md border p-2" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700">Chassis</label>
                                        <input type="text" name="chassisNo" value={newContainer.chassisNo} onChange={handleInputChange} className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 rounded-md border p-2" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700">Transporter</label>
                                        <input type="text" name="transporterName" value={newContainer.transporterName} onChange={handleInputChange} className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 rounded-md border p-2" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700">Cost</label>
                                        <input type="number" name="cost" value={newContainer.cost} onChange={handleInputChange} className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 rounded-md border p-2" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700">Location</label>
                                        <input type="text" name="location" value={newContainer.location} onChange={handleInputChange} className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 rounded-md border p-2" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700">DO No</label>
                                        <input type="text" name="deliveryOrderNo" value={newContainer.deliveryOrderNo} onChange={handleInputChange} className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 rounded-md border p-2" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700">Gate In</label>
                                        <input type="date" name="gateInDate" value={newContainer.gateInDate} onChange={handleInputChange} className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 rounded-md border p-2" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700">Gate Out</label>
                                        <input type="date" name="gateOutDate" value={newContainer.gateOutDate} onChange={handleInputChange} className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 rounded-md border p-2" />
                                    </div>
                                </div>
                                <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                                    <button type="button" onClick={saveContainer} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:col-start-2 sm:text-sm">
                                        Save
                                    </button>
                                    <button type="button" onClick={handleCloseModal} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:col-start-1 sm:text-sm">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
