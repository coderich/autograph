module.exports = {
  _id: 0,
  id: '$_id',
  dataId: 1,
  dataLink: 1,
  network: 1,
  workspaces: 1,
  dataChannels: 1,
  isMapped: 1,
  isParkingArea: 1,
  isCampusNavEnabled: 1,
  inheritAddress: 1,
  publishingStatus: {
    complete: '$publishingStatus.complete',
    missingFields: '$publishingStatus.missingFields',
    id: '$publishingStatus._id'
  },
  externalId: 1,
  waitTime: 1,
  waitTimeToken: 1,
  departmentIds: 1,
  metadata: {
    ui: {
      autoPopulateCoordinatesFromAddress: '$metadata.ui.autoPopulateCoordinatesFromAddress'
    },
    id: '$metadata._id'
  },
  order: 1,
  isPromotionItem: 1,
  v8Migrated: 1,
  validation: {
    status: '$validation.status',
    errors: {
      '$map': {
        input: '$validation.errors',
        as: 'embedded',
        in: {
          message: '$$embedded.message',
          path: '$$embedded.path',
          type: '$$embedded.type',
          context: {
            key: '$validation.errors.context.key',
            label: '$validation.errors.context.label',
            value: '$validation.errors.context.value'
          }
        }
      }
    },
    validators: {
      '$map': {
        input: '$validation.validators',
        as: 'embedded',
        in: {
          target: '$$embedded.target',
          status: '$$embedded.status',
          errors: {
            '$map': {
              input: '$$embedded.errors',
              as: 'embedded',
              in: {
                message: '$$embedded.message',
                path: '$$embedded.path',
                type: '$$embedded.type',
                context: {
                  key: '$validation.validators.errors.context.key',
                  label: '$validation.validators.errors.context.label',
                  value: '$validation.validators.errors.context.value'
                }
              }
            }
          }
        }
      }
    },
    createdAt: '$validation.createdAt',
    updatedAt: '$validation.updatedAt'
  },
  name: 1,
  shortName: 1,
  description: 1,
  defaultImage: 1,
  kioskMapImage: {
    image: '$kioskMapImage.image',
    cornerLocations: {
      left: '$kioskMapImage.cornerLocations.left',
      right: '$kioskMapImage.cornerLocations.right',
      top: '$kioskMapImage.cornerLocations.top',
      bottom: '$kioskMapImage.cornerLocations.bottom',
      id: '$kioskMapImage.cornerLocations._id',
      createdAt: '$kioskMapImage.cornerLocations.createdAt',
      updatedAt: '$kioskMapImage.cornerLocations.updatedAt'
    },
    rotationAngle: '$kioskMapImage.rotationAngle',
    id: '$kioskMapImage._id',
    createdAt: '$kioskMapImage.createdAt',
    updatedAt: '$kioskMapImage.updatedAt'
  },
  placeholderImage: 1,
  designation: '$dataType',
  media: 1,
  contact: {
    fax: '$contact.fax',
    phone: '$contact.phone',
    email: '$contact.email',
    hours: {
      name: '$contact.hours.name',
      description: '$contact.hours.description',
      startDate: '$contact.hours.startDate',
      endDate: '$contact.hours.endDate',
      type: '$contact.hours.type',
      custom: {
        '$map': {
          input: '$contact.hours.custom',
          as: 'embedded',
          in: {
            day: '$$embedded.day',
            status: '$$embedded.status',
            hours: {
              '$map': {
                input: '$$embedded.hours',
                as: 'embedded',
                in: {
                  startTime: '$$embedded.startTime',
                  endTime: '$$embedded.endTime'
                }
              }
            },
            id: '$$embedded._id',
            createdAt: '$$embedded.createdAt',
            updatedAt: '$$embedded.updatedAt'
          }
        }
      },
      id: '$contact.hours._id',
      createdAt: '$contact.hours.createdAt',
      updatedAt: '$contact.hours.updatedAt'
    },
    exceptionHours: {
      '$map': {
        input: '$contact.exceptionHours',
        as: 'embedded',
        in: {
          name: '$$embedded.name',
          description: '$$embedded.description',
          startDate: '$$embedded.startDate',
          endDate: '$$embedded.endDate',
          type: '$$embedded.type',
          custom: {
            '$map': {
              input: '$$embedded.custom',
              as: 'embedded',
              in: {
                day: '$$embedded.day',
                status: '$$embedded.status',
                hours: {
                  '$map': {
                    input: '$$embedded.hours',
                    as: 'embedded',
                    in: {
                      startTime: '$$embedded.startTime',
                      endTime: '$$embedded.endTime'
                    }
                  }
                },
                id: '$$embedded._id',
                createdAt: '$$embedded.createdAt',
                updatedAt: '$$embedded.updatedAt'
              }
            }
          },
          id: '$$embedded._id',
          createdAt: '$$embedded.createdAt',
          updatedAt: '$$embedded.updatedAt'
        }
      }
    }
  },
  timezone: 1,
  actionLinks: {
    '$map': {
      input: '$actionLinks',
      as: 'embedded',
      in: {
        id: '$$embedded._id',
        data: '$$embedded.data',
        name: '$$embedded.name',
        shortName: '$$embedded.shortName',
        type: '$$embedded.type',
        order: '$$embedded.order',
        icon: '$$embedded.image_id',
        categories: '$$embedded.categories',
        category: '$$embedded.category',
        curatedList: '$$embedded.curatedList',
        destination: {
          id: '$actionLinks.destination.id',
          type: '$actionLinks.destination.type',
          label: '$actionLinks.destination.label'
        },
        url: '$$embedded.url',
        showInDashboardView: '$$embedded.showInDashboardView',
        createdAt: '$$embedded.createdAt',
        updatedAt: '$$embedded.updatedAt'
      }
    }
  },
  tags: {
    '$map': {
      input: '$tags',
      as: 'embedded',
      in: {
        name: '$$embedded.name',
        weight: '$$embedded.weight',
        id: '$$embedded._id',
        createdAt: '$$embedded.createdAt',
        updatedAt: '$$embedded.updatedAt'
      }
    }
  },
  categories: 1,
  searchability: 1,
  navigation: {
    arrivalImage: '$navigation.arrivalImage',
    reroute: {
      directive: '$navigation.reroute.directive',
      destination: '$navigation.reroute.destination',
      message: '$navigation.reroute.message',
      image: '$navigation.reroute.image'
    },
    defaultPlace: '$navigation.defaultPlace',
    parkingType: '$navigation.parkingType',
    enableStrictParkingArrival: '$navigation.enableStrictParkingArrival',
    enableAlternateNavigation: '$navigation.enableAlternateNavigation',
    disclaimer: '$navigation.disclaimer',
    id: '$navigation._id'
  },
  visibility: 1,
  matching: {
    enabled: '$matching.enabled',
    rule: '$matching.rule',
    id: '$matching._id'
  },
  isDefault: 1,
  priority: 1,
  geoLocation: {
    address: {
      streetNumber: '$geoLocation.address.streetNumber',
      streetName: '$geoLocation.address.streetName',
      street: '$geoLocation.address.street',
      building: '$geoLocation.address.building',
      floor: '$geoLocation.address.floor',
      suite: '$geoLocation.address.suite',
      city: '$geoLocation.address.city',
      state: '$geoLocation.address.state',
      zip: '$geoLocation.address.zip',
      neighborhood: '$geoLocation.address.neighborhood',
      county: '$geoLocation.address.county',
      country: '$geoLocation.address.country',
      id: '$geoLocation.address._id',
      createdAt: '$geoLocation.address.createdAt',
      updatedAt: '$geoLocation.address.updatedAt'
    },
    geoAddress: {
      streetNumber: '$geoLocation.geoAddress.streetNumber',
      streetName: '$geoLocation.geoAddress.streetName',
      street: '$geoLocation.geoAddress.street',
      building: '$geoLocation.geoAddress.building',
      floor: '$geoLocation.geoAddress.floor',
      suite: '$geoLocation.geoAddress.suite',
      city: '$geoLocation.geoAddress.city',
      state: '$geoLocation.geoAddress.state',
      zip: '$geoLocation.geoAddress.zip',
      neighborhood: '$geoLocation.geoAddress.neighborhood',
      county: '$geoLocation.geoAddress.county',
      country: '$geoLocation.geoAddress.country',
      id: '$geoLocation.geoAddress._id',
      createdAt: '$geoLocation.geoAddress.createdAt',
      updatedAt: '$geoLocation.geoAddress.updatedAt'
    },
    geoPoint: {
      lat: '$geoLocation.geoPoint.lat',
      lng: '$geoLocation.geoPoint.lng'
    },
    markerPoint: {
      lat: '$geoLocation.markerPoint.lat',
      lng: '$geoLocation.markerPoint.lng'
    },
    navigationPoint: {
      lat: '$geoLocation.navigationPoint.lat',
      lng: '$geoLocation.navigationPoint.lng'
    },
    perimeter: {
      shape: '$geoLocation.perimeter.shape',
      points: {
        '$map': {
          input: '$geoLocation.perimeter.points',
          as: 'embedded',
          in: { lat: '$$embedded.lat', lng: '$$embedded.lng' }
        }
      },
      radius: '$geoLocation.perimeter.radius',
      id: '$geoLocation.perimeter._id'
    },
    plusCode: '$geoLocation.plusCode',
    id: '$geoLocation._id'
  },
  indoorLocation: {
    mapId: '$indoorLocation.mapId',
    mapKey: '$indoorLocation.mapKey',
    indoorPoint: {
      s: '$indoorLocation.indoorPoint.s',
      b: '$indoorLocation.indoorPoint.b',
      f: '$indoorLocation.indoorPoint.f',
      x: '$indoorLocation.indoorPoint.x',
      y: '$indoorLocation.indoorPoint.y'
    },
    plusCode: '$indoorLocation.plusCode',
    markerPoint: {
      s: '$indoorLocation.markerPoint.s',
      b: '$indoorLocation.markerPoint.b',
      f: '$indoorLocation.markerPoint.f',
      k: '$indoorLocation.markerPoint.k',
      x: '$indoorLocation.markerPoint.x',
      y: '$indoorLocation.markerPoint.y',
      id: '$indoorLocation.markerPoint._id'
    },
    geoPoint: {
      lat: '$indoorLocation.geoPoint.lat',
      lng: '$indoorLocation.geoPoint.lng'
    },
    perimeter: {
      shape: '$indoorLocation.perimeter.shape',
      points: {
        '$map': {
          input: '$indoorLocation.perimeter.points',
          as: 'embedded',
          in: {
            s: '$$embedded.s',
            b: '$$embedded.b',
            f: '$$embedded.f',
            x: '$$embedded.x',
            y: '$$embedded.y'
          }
        }
      },
      radius: '$indoorLocation.perimeter.radius',
      id: '$indoorLocation.perimeter._id'
    },
    id: '$indoorLocation._id'
  },
  geoIndoorTranslation: {
    rotation: '$geoIndoorTranslation.rotation',
    geoPoint: {
      lat: '$geoIndoorTranslation.geoPoint.lat',
      lng: '$geoIndoorTranslation.geoPoint.lng'
    },
    indoorPoint: {
      s: '$geoIndoorTranslation.indoorPoint.s',
      b: '$geoIndoorTranslation.indoorPoint.b',
      f: '$geoIndoorTranslation.indoorPoint.f',
      x: '$geoIndoorTranslation.indoorPoint.x',
      y: '$geoIndoorTranslation.indoorPoint.y'
    }
  },
  osmMapInfo: {
    boundNorth: '$osmMapInfo.boundNorth',
    boundSouth: '$osmMapInfo.boundSouth',
    boundEast: '$osmMapInfo.boundEast',
    boundWest: '$osmMapInfo.boundWest',
    changeset: '$osmMapInfo.changeset',
    mapKeys: '$osmMapInfo.mapKeys'
  },
  parent: 1,
  ancestors: 1,
  children: 1,
  descendants: 1,
  parentSite: 1,
  parentBuilding: 1,
  parentFloor: 1,
  parentPOI: 1,
  parentLandmark: 1,
  parentOffsite: 1,
  createdAt: 1,
  updatedAt: 1
};
